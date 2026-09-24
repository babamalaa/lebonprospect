#!/usr/bin/env python3
"""LeBonProspect — envoi des digests quotidiens à tous les abonnés actifs.
Appelé par le cron après l'ingestion. Pour chaque abonné actif :
  - récupère les leads de SA verticale × SA zone pour la dernière édition
  - 0 lead → pas d'email (jamais d'email vide)
  - envoie via Resend, logge dans digests_log, met à jour dernier_digest
Idempotent par jour: un abonné déjà servi aujourd'hui est sauté.

Usage:
  python3 send_digests.py            # envoi réel
  python3 send_digests.py --dry-run  # montre qui recevrait quoi, sans envoyer
"""
import os, sys, argparse, datetime, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from load_db import sql_exec
from digest import fetch_leads, render_digest, send_resend, VERT_LABELS

def _as_list(v):
    """Champ Supabase liste : déjà une liste, ou str postgres '{a,b}' / '{"a b","c"}'."""
    if not v:
        return []
    if isinstance(v, str):
        return [x.strip().strip('"') for x in v.strip("{}").split(",") if x.strip()]
    return list(v)

def plan_for_subscriber(s):
    """Retourne (verticales, regions, depts, villes, zone) pour un abonné, sans réseau."""
    # défaut appliqué avant parsing, comme l'ancien code : "{}" donne [] et non ["chr"]
    verticales = _as_list(s.get("verticales") or ["chr"])
    regions = _as_list(s.get("regions"))
    depts = _as_list(s.get("departements"))
    villes = _as_list(s.get("villes"))
    zone = (s.get("zone_label") or (villes[0] + " et alentours" if villes else None)) \
           or (", ".join(regions) if regions else (", ".join(depts) if depts else "France entière"))
    return verticales, regions, depts, villes, zone

def essai_expire(s, now):
    """True si l'essai dashboard est terminé depuis plus de 24 h sans premier paiement.
    Les essais Stripe ne sont pas concernés : le webhook Stripe gère déjà leur fin."""
    if not s.get("essai") or s.get("premier_paiement_at") or s.get("essai_source") != "dashboard":
        return False
    fin = s.get("essai_fin")
    if not fin:
        return False
    fin_dt = datetime.datetime.fromisoformat(str(fin).replace("Z", "+00:00"))
    if fin_dt.tzinfo is None:
        fin_dt = fin_dt.replace(tzinfo=datetime.timezone.utc)
    return (now - fin_dt) > datetime.timedelta(hours=24)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    today = datetime.date.today().isoformat()
    subs = sql_exec("select * from subscribers where statut = 'actif' order by id;")
    if not subs:
        print("Aucun abonné actif.")
        return
    # dernière édition disponible en base
    last_ed = sql_exec("select max(date_parution) as d from cessions;")[0]["d"]
    sent = skipped = empty = expired = 0
    for s in subs:
        if str(s.get("dernier_digest") or "") == today:
            skipped += 1
            continue
        if essai_expire(s, datetime.datetime.now(datetime.timezone.utc)):
            if not args.dry_run:
                sql_exec(f"update subscribers set statut = 'pause', essai_expire_at = now() where id = {s['id']};")
            expired += 1
            print(f"ESSAI EXPIRÉ: {s['email']} (fin {s.get('essai_fin')})")
            continue
        verticales, regions, depts, villes, zone = plan_for_subscriber(s)
        # collecte multi-verticales / multi-zones
        all_leads = []
        for v in verticales:
            if villes:   # zone sur mesure : liste de communes (dans le département indiqué si présent)
                all_leads += fetch_leads(v, departement=depts[0] if depts else None, date=str(last_ed), villes=villes)
            elif regions:
                for reg in regions:
                    all_leads += fetch_leads(v, region=reg, date=str(last_ed))
            elif depts:
                for d in depts:
                    all_leads += fetch_leads(v, departement=d, date=str(last_ed))
            else:  # national
                all_leads += fetch_leads(v, date=str(last_ed))
        if not all_leads:
            empty += 1
            continue
        v_main = verticales[0]
        html_body = render_digest(v_main, all_leads,
                                  region=", ".join(regions) if regions else None,
                                  departement=", ".join(depts) if depts else None,
                                  date=str(last_ed), zone_label=zone if villes else None)
        n = len(all_leads)
        subject = f"{n} reprise{'s' if n > 1 else ''} de commerces · {zone}"
        if args.dry_run:
            print(f"DRY: {s['email']:35s} ← {n} leads ({VERT_LABELS.get(v_main, v_main)} × {zone})")
            continue
        try:
            r = send_resend(s["email"], subject, html_body)
            sql_exec(f"insert into digests_log (subscriber_id, date_digest, nb_leads, resend_id) "
                     f"values ({s['id']}, '{today}', {n}, '{r.get('id', '')}');")
            sql_exec(f"update subscribers set dernier_digest = '{today}' where id = {s['id']};")
            sent += 1
            print(f"OK: {s['email']} ← {n} leads")
        except Exception as e:
            print(f"ERREUR {s['email']}: {e}", file=sys.stderr)
        time.sleep(0.3)
    print(f"BILAN: {sent} envoyés, {empty} sans leads (pas d'email), {skipped} déjà servis, {expired} essais expirés")

if __name__ == "__main__":
    main()
