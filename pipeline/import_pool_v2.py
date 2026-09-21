#!/usr/bin/env python3
"""Import v2 : insère dans prospects_pool uniquement les candidats validés par le tri IA.

Usage : python3 import_pool_v2.py <cibles_v2.csv> <verdicts.json>
  - cibles_v2.csv : sortie de find_targets_v2.py
  - verdicts.json : liste [{societe, verdict, raison}] ('garder' | 'retirer')
Les 'retirer' sont aussi insérés mais avec exclu_pool=true (mémoire : jamais re-proposés, jamais re-scrapés).
"""
import os, sys, csv, re, json
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from load_db import sql_exec

def esc(s): return (s or "").replace("'", "''")
def to_int(x):
    try: return int(x)
    except: return "null"

def main():
    csv_path, verdict_path = sys.argv[1], sys.argv[2]
    rows = list(csv.DictReader(open(csv_path, encoding="utf-8"), delimiter=";"))
    verdicts = {v["societe"]: v for v in json.load(open(verdict_path))}
    vals = []
    kept = excluded = 0
    for r in rows:
        v = verdicts.get(r["societe"])
        if not v:
            continue
        garder = v["verdict"] == "garder"
        kept += garder; excluded += (not garder)
        tel = r["telephone"]
        typ = "mobile" if re.sub(r"\D", "", tel)[:2] in ("06", "07") else "fixe"
        vals.append(
            f"('{esc(r['societe'])}','{esc(r['categorie'])}','{esc(r['region'])}','{esc(r['ville'])}','{esc(tel)}',"
            f"'{typ}','{esc(r['site_web'])}',{to_int(r['nb_avis'])},'a_contacter',"
            f"{'false' if garder else 'true'},{'null' if garder else chr(39) + esc(v.get('raison','tri v2')) + chr(39)},"
            f"{'null' if garder else 'now()'})"
        )
    if not vals:
        print("rien à importer"); return
    # insertion par paquets de 150 (limite de taille de requête)
    inserted = 0
    for i in range(0, len(vals), 150):
        chunk = ",\n".join(vals[i:i+150])
        r = sql_exec(f"""insert into prospects_pool
            (societe, categorie, region, ville, telephone, type_num, site_web, nb_avis, statut, exclu_pool, exclu_raison, exclu_at)
            values {chunk}
            on conflict (societe) do nothing returning id;""")
        inserted += len(r or [])
    print(f"DONE: {inserted} lignes insérées ({kept} gardés, {excluded} exclus mémorisés, doublons ignorés)")
    print(sql_exec("select count(*) filter (where not exclu_pool) actifs, count(*) filter (where not exclu_pool and closer_id is null) libres, count(*) filter (where exclu_pool) exclus from prospects_pool;"))

if __name__ == "__main__":
    main()
