#!/usr/bin/env python3
"""LeBonProspect — cron GitHub Actions (stateless).
Contrairement au cron local, le runner GitHub n'a pas l'historique JSONL.
Stratégie: demander à la DB le dernier jour présent, ingérer les jours
manquants jusqu'à hier (avec enrichissement), charger, rafraîchir stats.
"""
import datetime, os, sys, json

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from ingest import process_day, save_day
from load_db import sql_exec

def journal(etape, ok, nb=None, nb_ok=None, erreur=None, detail=None):
    """Une ligne par étape dans pipeline_runs (tableau de santé). Ne fait jamais échouer le traitement."""
    try:
        import json
        e = "null" if not erreur else "'" + str(erreur)[:300].replace("'", "''") + "'"
        d = "null" if detail is None else "$j$" + json.dumps(detail, ensure_ascii=False) + "$j$::jsonb"
        sql_exec(f"insert into pipeline_runs (etape, fin, ok, nb, nb_ok, erreur, detail) values "
                 f"('{etape}', now(), {'true' if ok else 'false'}, {'null' if nb is None else int(nb)}, {'null' if nb_ok is None else int(nb_ok)}, {e}, {d});")
    except Exception as ex:
        print(f"journal {etape} non enregistré : {ex}", file=sys.stderr)

def envoyer_digests():
    """Envoi des digests aux abonnés actifs. Idempotent : un abonné déjà servi aujourd'hui est sauté."""
    import subprocess, re
    rr = subprocess.run([sys.executable, "send_digests.py"], capture_output=True, text=True, cwd=HERE)
    out = (rr.stdout or "").strip()
    m = re.search(r"BILAN: (\d+) envoyés, (\d+) sans leads.*?(\d+) déjà servis", out)
    journal("digests", rr.returncode == 0, nb=(sum(int(x) for x in m.groups()) if m else None), nb_ok=(int(m.group(1)) if m else None),
            erreur=(rr.stderr[-300:] if rr.returncode != 0 else None), detail={"bilan": out.splitlines()[-1] if out else ""})
    print("digests:", out.splitlines()[-1] if out else rr.stderr[-300:])
    for ln in out.splitlines()[:-1]:
        print("  ", ln)
    if rr.returncode != 0:
        print(rr.stderr[-800:]); sys.exit(1)

def main():
    r = sql_exec("select coalesce(max(date_parution), current_date - 3) as last from cessions;")
    last = datetime.date.fromisoformat(str(r[0]["last"]))
    # On ingère jusqu'à AUJOURD'HUI : le Journal officiel publie dans la nuit, l'édition du jour est disponible dès le matin
    # (constaté le 6 oct. : 289 avis datés du 06/10 à 7h30). Avant, on s'arrêtait à « hier » et chaque édition arrivait avec un jour de retard.
    today = datetime.date.today()
    days = []
    d = last      # on RE-ingère le dernier jour connu : l'insertion est idempotente (bodacc_id), et il a pu être récupéré incomplet la veille
    while d <= today and len(days) < 10:
        days.append(d.isoformat())
        d += datetime.timedelta(1)
    if not days:
        print(f"Rien à ingérer: base à jour jusqu'au {last}. Envoi des digests quand même.")
        envoyer_digests()
        return
    print(f"Jours à ingérer: {days}")
    cache = {}
    total = 0
    for day in days:
        recs = process_day(day, enrich=True, cache=cache)
        save_day(day, recs)
        total += len(recs)
        print(f"{day}: {len(recs)} cessions", flush=True)
    # Import
    import subprocess
    rr = subprocess.run([sys.executable, "load_db.py"], capture_output=True, text=True, cwd=HERE)
    print(rr.stdout[-2000:])
    if rr.returncode != 0:
        print(rr.stderr[-2000:])
        journal("ingest", False, nb=total, erreur=rr.stderr[-300:], detail={"jours": days})
        sys.exit(1)
    journal("ingest", True, nb=total, detail={"jours": days})
    sql_exec("refresh materialized view stats_verticale_region;")
    # Enrichissement téléphones (Places) sur les jours fraîchement ingérés
    rr = subprocess.run([sys.executable, "enrich_places.py", "--days", "3"],
                        capture_output=True, text=True, cwd=HERE)
    print("places:", (rr.stdout or "").strip().splitlines()[-1] if rr.stdout else rr.stderr[-300:])
    # NOUVELLE TENTATIVE : une seule, à J+22, pour les fiches sans numéro (la tentative de J+8 a été supprimée le 18 oct. 2026).
    # Un commerce tout juste repris met souvent quelques semaines à apparaître sur Google.
    sql_exec("update cessions set enrichi_places = false "
             "where telephone is null and places_tentatives = 1 and date_parution = current_date - 22;")
    rr = subprocess.run([sys.executable, "enrich_places.py", "--days", "30"],
                        capture_output=True, text=True, cwd=HERE)
    print("places-retry:", (rr.stdout or "").strip().splitlines()[-1] if rr.stdout else "rien")
    envoyer_digests()
    print(f"OK: {total} cessions ingérées, stats rafraîchies.")

if __name__ == "__main__":
    main()
