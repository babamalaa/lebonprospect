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
from digest import fetch_leads, fetch_range, build_email, render_digest, send_resend, VERT_LABELS, REPLY_TO

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

def _snapshot(leads):
    out = []
    for r in leads:
        c = r.get("acheteur_date_creation")
        neuf = bool(c and (datetime.date.fromisoformat(str(r["date_parution"])[:10]) - datetime.date.fromisoformat(str(c)[:10])).days <= 180)
        out.append({"id": r.get("id"), "nom": (r.get("acheteur_nom") or r.get("commercant") or "").split("(")[0].strip()[:80],
                    "ville": (r.get("ville") or "").split(",")[0], "dept": r.get("departement"), "tel": bool(r.get("telephone")), "neuf": neuf,
                    "date": str(r.get("date_parution")), "naf": r.get("naf_fonds") or r.get("acheteur_naf")})
    return out

def _log_test(s, kind, subject, html_body, leads, edition, resend_id, today):
    import json
    snap = json.dumps(_snapshot(leads), ensure_ascii=False).replace("$lbp$", "")
    h = html_body.replace("$lbp$", "")
    sql_exec(f"insert into digests_log (subscriber_id, date_digest, nb_leads, resend_id, statut, type, sujet, edition, lead_snapshot, html) "
             f"values ({s['id']}, '{today}', {len(leads)}, '{resend_id}', 'envoye', '{kind}', $lbp${subject}$lbp$, '{edition}', $lbp${snap}$lbp$::jsonb, $lbp${h}$lbp$);")

def numeros_verifies(leads):
    """Garde-fou : un abonné de l'essai ne reçoit que des numéros validés par la règle stricte (tel_validation renseigné et non rejeté).
    Un numéro jamais vérifié est masqué (« bientôt disponible ») plutôt que risqué."""
    out = []
    for r in leads:
        v = r.get("tel_validation")
        if r.get("telephone") and (not v or str(v).startswith("rejete")):
            r = {**r, "telephone": None}
        out.append(r)
    return out

def deja_envoyes(sub_ids):
    """SIREN des repreneurs déjà reçus (toutes adresses de la même personne) : sert à ne pas renvoyer un avis rectificatif
    d'une reprise que la personne a déjà dans ses emails."""
    ids = ",".join(str(i) for i in sub_ids)
    rows = sql_exec(f"""select distinct c.acheteur_siren from digests_log l, jsonb_array_elements(l.lead_snapshot) x
        join cessions c on c.id = (x->>'id')::bigint
        where l.subscriber_id in ({ids}) and l.type in ('bienvenue','quotidien','filet','hebdo') and c.acheteur_siren is not null;""")
    return {r["acheteur_siren"] for r in rows}

_CODE_DEPT = {}

def _code_dept(dept):
    """Code à 2 chiffres d'un département (le plus fréquent dans les codes postaux d'une fiche à commune unique)."""
    if not _CODE_DEPT:
        for r in sql_exec("select departement, mode() within group (order by left(cp,2)) code from cessions where cp ~ '^[0-9]{5}$' group by 1;"):
            _CODE_DEPT[r["departement"]] = r["code"]
    return _CODE_DEPT.get(dept)

def dans_la_zone(leads, depts):
    """Le BODACC range une fiche selon le TRIBUNAL, pas selon le repreneur : un repreneur du Rhône peut apparaître en Côte-d'Or
    parce que l'ancien propriétaire y était. On ne garde que les fiches dont le repreneur OU le fonds est réellement dans la zone."""
    import re
    codes = {_code_dept(d) for d in depts if _code_dept(d)}
    out = []
    for r in leads:
        cps = re.findall(r"(\d{5})", (r.get("acheteur_adresse") or "")) + re.findall(r"(\d{5})", (r.get("cp") or ""))
        if not cps or any(c[:2] in codes for c in cps): out.append(r)   # sans code postal : on garde (pas de preuve d'erreur)
    return out

def sans_rectificatifs_deja_vus(leads, sirens_vus):
    """Retire les avis rectificatifs dont la reprise a déjà été envoyée ; garde tout le reste."""
    return [r for r in leads if not (r.get("type_avis") == "Avis rectificatif" and r.get("acheteur_siren") in sirens_vus)]

def handle_test_subscriber(s, last_ed, today, dry):
    """Abonné suivi (essai Verisure) : bienvenue au premier passage, sinon quotidien ou « filet » (jamais de silence),
    plus un récapitulatif le lundi. Un seul passage par édition BODACC, jamais deux fois le même jour."""
    verticales, regions, depts, villes, zone = plan_for_subscriber(s)
    vert = verticales[0] if verticales else "commerces"
    deja = sql_exec(f"select type, edition from digests_log where subscriber_id = {s['id']} and type is not null order by id;")
    types_faits = [d["type"] for d in deja]
    editions = {str(d["edition"]) for d in deja if d.get("edition")}
    jour = datetime.date.fromisoformat(today)
    envois = []   # (kind, leads, date_from)
    ed = datetime.date.fromisoformat(str(last_ed))
    if "bienvenue" not in types_faits and "bienvenue_ignoree" not in types_faits:
        d1 = (ed - datetime.timedelta(days=14)).isoformat()
        envois.append(("bienvenue", numeros_verifies(dans_la_zone(fetch_range(vert, depts, d1, str(last_ed), limit=80), depts)[:60]), d1))
    elif str(last_ed) not in editions:
        pers = sql_exec(f"select id from subscribers where suivi_test and nom = $n${s.get('nom') or ''}$n$;")
        vus = deja_envoyes([p["id"] for p in pers] or [s["id"]])
        leads = numeros_verifies(sans_rectificatifs_deja_vus(dans_la_zone(fetch_range(vert, depts, str(last_ed), str(last_ed), limit=80), depts), vus))
        if leads: envois.append(("quotidien", leads, None))
        else: envois.append(("filet", numeros_verifies(dans_la_zone(fetch_range(vert, depts, None, str(last_ed), limit=20), depts)[:5]), None))
        if jour.weekday() == 0 and not any(d["type"] == "hebdo" and str(d["edition"]) == str(last_ed) for d in deja):
            d1 = (ed - datetime.timedelta(days=6)).isoformat()
            envois.append(("hebdo", numeros_verifies(dans_la_zone(fetch_range(vert, depts, d1, str(last_ed), limit=80), depts)[:60]), d1))
    res = []
    for kind, leads, d1 in envois:
        if not leads:
            print(f"  (test) {s['email']} : {kind} sans aucune reprise exploitable, rien envoyé"); continue
        subject, body = build_email(kind, leads, zone, depts, last_ed, d1, nom=s.get("nom"))
        if dry:
            print(f"DRY[{kind}]: {s['email']:35s} ← {len(leads)} leads · {subject}"); continue
        r = send_resend(s["email"], subject, body, reply_to=REPLY_TO)
        _log_test(s, kind, subject, body, leads, last_ed, r.get("id", ""), today)
        sql_exec(f"update subscribers set dernier_digest = '{today}' where id = {s['id']};")
        print(f"OK[{kind}]: {s['email']} ← {len(leads)} leads")
        res.append(kind); time.sleep(0.3)
    return res

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
        if s.get("suivi_test"):
            if handle_test_subscriber(s, last_ed, today, args.dry_run): sent += 1
            else: empty += 1
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
    print(f"BILAN: {sent} envoyés, {empty} sans leads (pas d'email), {skipped} déjà servis")

if __name__ == "__main__":
    main()
