#!/usr/bin/env python3
"""LeBonProspect — enrichissement téléphone via Google Places API (New).
Pour chaque cession d'une verticale vendable, cherche la fiche de
l'établissement (nom du fonds/vendeur + adresse) et récupère le téléphone.

Règle de confiance :
  - fixe (01-05, 09) = ligne de l'établissement, reprise avec le fonds → haute
  - mobile (06/07) = possiblement le portable de l'ancien gérant → moyenne
On stocke telephone + telephone_confiance, jamais de numéro inventé.

Usage:
  python3 enrich_places.py --days 7                # les N derniers jours (verticales vendables)
  python3 enrich_places.py --date 2026-09-06       # un jour précis
  python3 enrich_places.py --days 90 --verticale chr
Coût: ~0.017 $ / requête Text Search (Essentials). 1000 leads ≈ 17 $.
"""
import json, os, sys, argparse, urllib.request, time, re, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from load_db import sql_exec, env

VENDABLES = ("chr", "alimentaire", "coiffure_beaute", "garage_auto",
             "pressing_services", "sante", "fleuriste", "tabac_presse")

def places_search(query):
    key = env("GOOGLE_PLACES_KEY")
    req = urllib.request.Request(
        "https://places.googleapis.com/v1/places:searchText",
        data=json.dumps({"textQuery": query, "languageCode": "fr",
                         "regionCode": "FR", "maxResultCount": 1}).encode(),
        headers={"Content-Type": "application/json",
                 "X-Goog-Api-Key": key,
                 "X-Goog-FieldMask": "places.displayName,places.nationalPhoneNumber,places.formattedAddress"},
        method="POST")
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            d = json.loads(r.read().decode())
        return (d.get("places") or [None])[0]
    except Exception:
        return None

def confiance(tel):
    t = tel.replace(" ", "")
    return "fixe_etablissement" if re.match(r"^0[1-5,9]", t) else "mobile"

def best_query(row):
    """Nom du FONDS (= le commerce physique) + ville. Le vendeur porte souvent
    le nom de l'établissement ; sinon le champ commercant du BODACC."""
    nom = row.get("vendeur_nom") or row.get("commercant") or ""
    # nettoie les mentions parasites du commercant ("X, Y" → premier segment utile)
    nom = nom.split(",")[0].strip()
    ville = (row.get("ville") or "").split(",")[0].strip()
    adresse = row.get("acheteur_adresse") or ""
    return f"{nom} {adresse}" if adresse and nom else f"{nom} {ville}"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int)
    ap.add_argument("--date")
    ap.add_argument("--verticale")
    ap.add_argument("--limit", type=int, default=2000)
    ap.add_argument("--villes", help="liste de communes séparées par | : enrichit TOUTES les verticales sur ces communes (abonné zone sur mesure)")
    ap.add_argument("--departement")
    args = ap.parse_args()
    conds = ["telephone is null", "enrichi_places = false"]
    if args.villes:
        vl = ",".join("'" + v.strip().replace("'", "''") + "'" for v in args.villes.split("|") if v.strip())
        conds.append(f"split_part(ville, ',', 1) in ({vl})")
        if args.departement: conds.append(f"departement = '{args.departement.replace(chr(39), chr(39)*2)}'")
    elif args.verticale:
        conds.append(f"verticale = '{args.verticale}'")
    else:
        conds.append("verticale in " + str(VENDABLES))
    if args.date:
        conds.append(f"date_parution = '{args.date}'")
    elif args.days:
        conds.append(f"date_parution >= current_date - {args.days}")
    rows = sql_exec(f"select id, bodacc_id, commercant, ville, vendeur_nom, acheteur_adresse "
                    f"from cessions where {' and '.join(conds)} order by date_parution desc limit {args.limit};")
    print(f"{len(rows)} cessions à enrichir")
    found = 0
    pending = []   # (id, set_clause) : écriture groupée toutes les 25 lignes pour ménager l'API Supabase
    def flush():
        if not pending: return
        for attempt in range(4):
            try:
                sql_exec("update cessions set " + "; update cessions set ".join(f"{sc} where id = {i}" for i, sc in pending) + ";")
                pending.clear(); return
            except Exception as e:
                time.sleep(3 * (attempt + 1))
        pending.clear()
    for i, row in enumerate(rows):
        q = best_query(row)
        if len(q.strip()) < 8:
            pending.append((row['id'], "enrichi_places = true"))
            continue
        place = places_search(q)
        tel = (place or {}).get("nationalPhoneNumber")
        if tel:
            conf = confiance(tel)
            pname = (place.get("displayName") or {}).get("text", "").replace("'", "''")
            pending.append((row['id'], f"telephone = '{tel}', telephone_confiance = '{conf}', place_name = '{pname}', enrichi_places = true, places_tentatives = places_tentatives + 1"))
            found += 1
        else:
            pending.append((row['id'], "enrichi_places = true, places_tentatives = places_tentatives + 1"))
        if len(pending) >= 25: flush()
        if (i + 1) % 50 == 0:
            print(f"  {i+1}/{len(rows)} traités, {found} téléphones", flush=True)
        time.sleep(0.06)  # ~15 req/s max
    flush()
    print(f"DONE: {found}/{len(rows)} téléphones trouvés ({100*found/max(len(rows),1):.0f}%)")

if __name__ == "__main__":
    main()
