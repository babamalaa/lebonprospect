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
    sent = skipped = empty = 0
    for s in subs:
        if str(s.get("dernier_digest") or "") == today:
            skipped += 1
            continue
        verticales = s.get("verticales") or ["chr"]
        if isinstance(verticales, str):
            verticales = [v.strip() for v in verticales.strip("{}").split(",") if v.strip()]
        regions = s.get("regions") or []
        if isinstance(regions, str):
            regions = [r.strip() for r in regions.strip("{}").split(",") if r.strip()]
        depts = s.get("departements") or []
        if isinstance(depts, str):
            depts = [d.strip() for d in depts.strip("{}").split(",") if d.strip()]
        # collecte multi-verticales / multi-zones
        all_leads = []
        for v in verticales:
            if regions:
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
        zone = ", ".join(regions) if regions else (", ".join(depts) if depts else "France entière")
        v_main = verticales[0]
        html_body = render_digest(v_main, all_leads,
                                  region=", ".join(regions) if regions else None,
                                  departement=", ".join(depts) if depts else None,
                                  date=str(last_ed))
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
    print(f"BILAN: {sent} envoyés, {empty} sans leads (pas d'email), {skipped} déjà servis")

if __name__ == "__main__":
    main()
