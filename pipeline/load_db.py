#!/usr/bin/env python3
"""LeBonProspect — import des JSONL du backfill vers Supabase (Postgres).
Usage: python3 load_db.py [--dir ../data/cessions]
Lit SUPABASE_PROJECT_REF + SUPABASE_TOKEN depuis l'environnement ou ~/.repreneur-env.
Utilise l'endpoint management /database/query (même méthode éprouvée que Balise).
Idempotent: ON CONFLICT (bodacc_id) DO NOTHING.
"""
import json, os, sys, glob, urllib.request, argparse, time

def env(key):
    if os.environ.get(key):
        return os.environ[key]
    envfile = os.path.expanduser("~/.repreneur-env")
    if os.path.exists(envfile):
        for line in open(envfile):
            if line.startswith(key + "="):
                return line.strip().split("=", 1)[1]
    sys.exit(f"Missing {key} (env or ~/.repreneur-env)")

def sql_exec(query):
    ref, token = env("SUPABASE_PROJECT_REF"), env("SUPABASE_TOKEN")
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{ref}/database/query",
        data=json.dumps({"query": query}).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json",
                 "User-Agent": "lebonprospect-pipeline/1.0"},
        method="POST")
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode())

def esc(v):
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, list):
        inner = ",".join("\"" + str(x).replace('"', '\\"') + "\"" for x in v)
        return "'{" + inner.replace("'", "''") + "}'"
    return "'" + str(v).replace("'", "''") + "'"

def row_values(r):
    ai = r.get("acheteur_info") or {}
    vi = r.get("vendeur_info") or {}
    date_crea = ai.get("date_creation") or None
    return "(" + ",".join([
        esc(r.get("bodacc_id")), esc(r.get("date_parution")), esc(r.get("type_avis")),
        esc(r.get("commercant")), esc(r.get("ville")), esc(r.get("cp")),
        esc(r.get("departement")), esc(r.get("region")), esc(r.get("tribunal")),
        esc(r.get("acheteur_siren")), esc(ai.get("nom_complet")),
        esc(None), esc(ai.get("naf")), esc(date_crea),
        esc(ai.get("dirigeants") or []), esc(ai.get("siege_adresse")),
        esc(r.get("vendeur_siren")), esc(vi.get("nom_complet")), esc(vi.get("naf")),
        esc(r.get("naf_fonds")), esc(r.get("verticale") or "inconnu"),
        esc(r.get("acte_descriptif")),
    ]) + ")"

COLS = ("bodacc_id,date_parution,type_avis,commercant,ville,cp,departement,region,tribunal,"
        "acheteur_siren,acheteur_nom,acheteur_forme,acheteur_naf,acheteur_date_creation,"
        "acheteur_dirigeants,acheteur_adresse,vendeur_siren,vendeur_nom,vendeur_naf,"
        "naf_fonds,verticale,acte_descriptif")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "cessions"))
    ap.add_argument("--batch", type=int, default=200)
    args = ap.parse_args()
    files = sorted(glob.glob(os.path.join(args.dir, "*.jsonl")))
    total = 0
    for fp in files:
        rows = [json.loads(l) for l in open(fp) if l.strip()]
        if not rows:
            continue
        for i in range(0, len(rows), args.batch):
            chunk = rows[i:i + args.batch]
            values = ",\n".join(row_values(r) for r in chunk)
            q = (f"insert into cessions ({COLS}) values {values} "
                 "on conflict (bodacc_id) do update set "
                 "acheteur_naf=excluded.acheteur_naf, acheteur_nom=excluded.acheteur_nom, "
                 "acheteur_date_creation=excluded.acheteur_date_creation, "
                 "acheteur_dirigeants=excluded.acheteur_dirigeants, acheteur_adresse=excluded.acheteur_adresse, "
                 "vendeur_nom=excluded.vendeur_nom, vendeur_naf=excluded.vendeur_naf, "
                 "naf_fonds=excluded.naf_fonds, verticale=excluded.verticale "
                 "where cessions.verticale = 'inconnu' and excluded.verticale <> 'inconnu';")
            sql_exec(q)
            total += len(chunk)
            time.sleep(0.1)
        print(f"{os.path.basename(fp)}: {len(rows)} rows")
    print(f"TOTAL importé: {total}")

if __name__ == "__main__":
    main()
