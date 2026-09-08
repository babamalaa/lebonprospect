#!/usr/bin/env python3
"""LeBonProspect — prospection : constitution de la liste des cibles CHR.
Interroge Google Places (Text Search) sur des catégories de fournisseurs CHR
dans les grandes villes IDF / AURA / PACA. Déduplique, score, exporte CSV.

Usage: python3 find_targets.py
Sortie: ../data/cibles_chr.csv (séparateur ;, UTF-8)
"""
import json, os, sys, urllib.request, time, csv, re

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from load_db import env

CATEGORIES = {
    "agenceur": ["agencement restaurant", "agencement CHR cuisine professionnelle"],
    "materiel_cuisine": ["fournisseur matériel cuisine professionnelle restaurant",
                          "équipement CHR froid professionnel"],
    "caisse": ["caisse enregistreuse restaurant", "logiciel caisse restaurant"],
    "enseigniste": ["enseigne lumineuse commerce", "fabricant enseigne magasin"],
    "mobilier": ["mobilier restaurant professionnel", "mobilier terrasse CHR"],
}

VILLES = {
    "Île-de-France": ["Paris", "Boulogne-Billancourt", "Créteil", "Versailles", "Cergy"],
    "Auvergne-Rhône-Alpes": ["Lyon", "Grenoble", "Saint-Étienne", "Annecy", "Clermont-Ferrand"],
    "PACA": ["Marseille", "Nice", "Toulon", "Aix-en-Provence", "Avignon"],
}

FIELDS = ("places.displayName,places.nationalPhoneNumber,places.websiteUri,"
          "places.formattedAddress,places.rating,places.userRatingCount,places.businessStatus")

def search(query, max_results=12):
    key = env("GOOGLE_PLACES_KEY")
    req = urllib.request.Request(
        "https://places.googleapis.com/v1/places:searchText",
        data=json.dumps({"textQuery": query, "languageCode": "fr", "regionCode": "FR",
                         "maxResultCount": max_results}).encode(),
        headers={"Content-Type": "application/json", "X-Goog-Api-Key": key,
                 "X-Goog-FieldMask": FIELDS}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            return json.loads(r.read().decode()).get("places", [])
    except Exception as e:
        print(f"  ERR {query[:40]}: {e}", file=sys.stderr)
        return []

def main():
    seen, rows = set(), []
    n_queries = 0
    for region, villes in VILLES.items():
        for ville in villes:
            for cat, queries in CATEGORIES.items():
                for q in queries:
                    full_q = f"{q} {ville}"
                    n_queries += 1
                    for p in search(full_q):
                        if p.get("businessStatus") not in (None, "OPERATIONAL"):
                            continue
                        name = (p.get("displayName") or {}).get("text", "")
                        addr = p.get("formattedAddress", "")
                        key_dedup = re.sub(r"\W", "", name.lower())[:30]
                        if not name or key_dedup in seen:
                            continue
                        seen.add(key_dedup)
                        rows.append({
                            "societe": name,
                            "categorie": cat,
                            "region": region,
                            "ville_recherche": ville,
                            "telephone": p.get("nationalPhoneNumber", ""),
                            "site_web": p.get("websiteUri", ""),
                            "adresse": addr,
                            "note_google": p.get("rating", ""),
                            "nb_avis": p.get("userRatingCount", ""),
                        })
                    time.sleep(0.1)
            print(f"{region} / {ville}: cumul {len(rows)} cibles uniques", flush=True)
    # Score: privilégier les pros établis avec site web et du volume d'avis
    def score(r):
        s = 0
        if r["site_web"]: s += 3
        if r["telephone"]: s += 2
        try: s += min(int(r["nb_avis"] or 0), 100) / 25
        except (ValueError, TypeError): pass
        return -s
    rows.sort(key=score)
    out = os.path.join(HERE, "..", "data", "cibles_chr.csv")
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()), delimiter=";")
        w.writeheader()
        w.writerows(rows)
    print(f"\nDONE: {len(rows)} cibles uniques ({n_queries} requêtes) → {out}")
    from collections import Counter
    print("Par catégorie:", dict(Counter(r['categorie'] for r in rows)))
    print("Par région:", dict(Counter(r['region'] for r in rows)))

if __name__ == "__main__":
    main()
