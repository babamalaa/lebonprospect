#!/usr/bin/env python3
"""LeBonProspect — réassort de prospects pour un closer.
Pioche de nouvelles cibles CHR dans le vivier (data/cibles_chr.csv), exclut
celles déjà présentes en base (prospects_calls), génère leur lien /pour/<slug>,
les insère assignées à un closer.

Usage:
  python3 refill_prospects.py --closer closer_a --n 20
  python3 refill_prospects.py --closer closer_b --n 15 --region "Provence-Alpes-Côte d'Azur"
"""
import os, sys, csv, argparse, re
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from load_db import sql_exec

REGION_MAP = {"PACA": "Provence-Alpes-Côte d'Azur"}
CAT_LABELS = {
    "agenceur": "l'agencement CHR", "materiel_cuisine": "l'équipement de cuisine professionnelle",
    "caisse": "les solutions d'encaissement", "enseigniste": "l'enseigne et la signalétique",
    "mobilier": "le mobilier professionnel",
}

def slug(s):
    s = s.lower()
    for a, b in [("é","e"),("è","e"),("ê","e"),("à","a"),("ç","c"),("ô","o"),("î","i"),("û","u"),("ë","e"),("ï","i")]:
        s = s.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:40]

def to_int(x):
    try: return int(x)
    except: return 0

def esc(s):
    return (s or "").replace("'", "''")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--closer", required=True)
    ap.add_argument("--n", type=int, default=20)
    ap.add_argument("--region", help="filtrer une région précise (sinon toutes)")
    args = ap.parse_args()

    existing = {r["societe"] for r in sql_exec("select societe from prospects_calls;")}
    print(f"{len(existing)} prospects déjà en base (tous closers confondus)")

    pool = list(csv.DictReader(open(os.path.join(HERE, "..", "data", "cibles_chr.csv")), delimiter=";"))
    picks = []
    for r in pool:
        if r["societe"] in existing:
            continue
        if not r["telephone"] or not r["site_web"]:
            continue
        region = REGION_MAP.get(r["region"], r["region"])
        if args.region and region != args.region:
            continue
        n_avis = to_int(r["nb_avis"])
        if n_avis < 6:
            continue
        picks.append((r, region))

    # score simple: favorise mobile (patron probable) + volume d'avis modéré
    def score(item):
        r, _ = item
        n = to_int(r["nb_avis"])
        tel = r["telephone"].replace(" ", "")
        mob = 6 if tel.startswith(("06", "07")) else 0
        return -(30 - abs(n - 25) + mob)
    picks.sort(key=score)

    selected = picks[:args.n]
    if not selected:
        print("Aucun nouveau prospect disponible avec ces critères.")
        return

    # priorité continue pour ce closer
    r = sql_exec(f"select coalesce(max(priorite),0) m from prospects_calls where closer = '{esc(args.closer)}';")
    next_prio = r[0]["m"] + 1

    inserted = 0
    for r, region in selected:
        lien = f"https://www.lebonprospect.fr/pour/{slug(r['societe'])}"
        sql_exec(f"""insert into prospects_calls
            (priorite, societe, categorie, region, ville, telephone, type_num, site_web, lien_teaser, closer, statut)
            values ({next_prio}, '{esc(r['societe'])}', '{esc(r['categorie'])}', '{esc(region)}',
            '{esc(r['ville_recherche'])}', '{esc(r['telephone'])}',
            '{esc("mobile-patron?" if r['telephone'].replace(" ","").startswith(("06","07")) else "fixe")}',
            '{esc(r['site_web'])}', '{esc(lien)}', '{esc(args.closer)}', 'a_contacter')
            on conflict do nothing;""")
        next_prio += 1
        inserted += 1

    print(f"DONE: {inserted} nouveaux prospects assignés à {args.closer}"
          f"{' (' + args.region + ')' if args.region else ''}")
    cats = Counter(r["categorie"] for r, _ in selected)
    print("Répartition:", dict(cats))

if __name__ == "__main__":
    main()
