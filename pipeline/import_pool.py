#!/usr/bin/env python3
"""Import complet du vivier CHR (data/cibles_chr.csv) dans prospects_pool.
Tous les prospects démarrent non réclamés (closer_id = null) ; les closers
les récupèrent via le bouton "Recevoir des leads" du dashboard.
"""
import os, sys, csv, re

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from load_db import sql_exec

REGION_MAP = {"PACA": "Provence-Alpes-Côte d'Azur"}

def slug(s):
    s = s.lower()
    for a, b in [("é","e"),("è","e"),("ê","e"),("à","a"),("ç","c"),("ô","o"),("î","i"),("û","u"),("ë","e"),("ï","i")]:
        s = s.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:40]

def esc(s):
    return (s or "").replace("'", "''")

def to_int(x):
    try: return int(x)
    except: return "null"

def main():
    rows = list(csv.DictReader(open(os.path.join(HERE, "..", "data", "cibles_chr.csv")), delimiter=";"))
    n = 0
    for r in rows:
        if not r["telephone"] or not r["site_web"]:
            continue
        region = REGION_MAP.get(r["region"], r["region"])
        lien = f"https://www.lebonprospect.fr/pour/{slug(r['societe'])}"
        avis = to_int(r["nb_avis"])
        sql_exec(f"""insert into prospects_pool
            (societe, categorie, region, ville, telephone, type_num, site_web, nb_avis, lien_teaser, statut)
            values ('{esc(r['societe'])}', '{esc(r['categorie'])}', '{esc(region)}',
            '{esc(r['ville_recherche'])}', '{esc(r['telephone'])}',
            '{esc("mobile" if r['telephone'].replace(" ","").startswith(("06","07")) else "fixe")}',
            '{esc(r['site_web'])}', {avis}, '{esc(lien)}', 'a_contacter')
            on conflict (societe) do nothing;""")
        n += 1
    print(f"DONE: {n} prospects tentés (doublons ignorés via unique societe)")

if __name__ == "__main__":
    main()
