#!/usr/bin/env python3
"""LeBonProspect — cron quotidien (8h Paris).
1. Ingère les cessions de la veille (avec enrichissement NAF)
2. Les charge en base
3. Rafraîchit les stats
4. (à venir J5) déclenche les digests email par abonné

Conçu pour tourner en local d'abord (launchd/cron), puis migrer en
Vercel cron / GitHub Action une fois stable. Logge dans data/cron.log.
"""
import datetime, subprocess, sys, os

HERE = os.path.dirname(os.path.abspath(__file__))
LOG = os.path.join(HERE, "..", "data", "cron.log")

def log(msg):
    stamp = datetime.datetime.now().isoformat(timespec="seconds")
    line = f"[{stamp}] {msg}"
    print(line)
    with open(LOG, "a") as f:
        f.write(line + "\n")

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True, cwd=HERE)
    if r.returncode != 0:
        log(f"ERREUR {' '.join(cmd)}: {r.stderr[-500:]}")
        sys.exit(1)
    return r.stdout

def main():
    # Rattrapage: ingérer tous les jours manquants depuis le dernier fichier local (max 7)
    datadir = os.path.join(HERE, "..", "data", "cessions")
    have = sorted(f[:-6] for f in os.listdir(datadir) if f.endswith(".jsonl"))
    last = datetime.date.fromisoformat(have[-1]) if have else datetime.date.today() - datetime.timedelta(2)
    yesterday = datetime.date.today() - datetime.timedelta(1)
    days = []
    d = last + datetime.timedelta(1)
    while d <= yesterday and len(days) < 7:
        days.append(d.isoformat())
        d += datetime.timedelta(1)
    if not days:
        days = [yesterday.isoformat()]
    log(f"=== cron start — ingestion {', '.join(days)} ===")
    for day in days:
        out = run([sys.executable, "ingest.py", "--date", day])
        log(out.strip())
    out = run([sys.executable, "load_db.py", "--dir",
               os.path.join(HERE, "..", "data", "cessions")])
    log(out.strip().splitlines()[-1] if out.strip() else "load: rien")
    # Rafraîchir la vue matérialisée des stats
    try:
        sys.path.insert(0, HERE)
        from load_db import sql_exec
        sql_exec("refresh materialized view stats_verticale_region;")
        log("stats refresh OK")
    except Exception as e:
        log(f"stats refresh KO: {e}")
    log("=== cron done ===")

if __name__ == "__main__":
    main()
