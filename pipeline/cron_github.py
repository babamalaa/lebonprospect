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

def main():
    r = sql_exec("select coalesce(max(date_parution), current_date - 3) as last from cessions;")
    last = datetime.date.fromisoformat(str(r[0]["last"]))
    yesterday = datetime.date.today() - datetime.timedelta(1)
    days = []
    d = last + datetime.timedelta(1)
    while d <= yesterday and len(days) < 10:
        days.append(d.isoformat())
        d += datetime.timedelta(1)
    if not days:
        print(f"Rien à faire: base à jour jusqu'au {last}")
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
        sys.exit(1)
    sql_exec("refresh materialized view stats_verticale_region;")
    print(f"OK: {total} cessions ingérées, stats rafraîchies.")

if __name__ == "__main__":
    main()
