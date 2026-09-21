#!/usr/bin/env python3
"""LeBonProspect — scraping v2 des fournisseurs CHR (Google Places Text Search).

Différences avec la v1 (qui a produit ~50 % de hors-sujet) :
  1. Requêtes formulées "fournisseur pro" (grossiste, professionnel, CHR) plutôt que "restaurant <ville>".
  2. Filtre sur les `types` Google : on rejette d'emblée restaurants, cafés, cuisinistes grand public,
     immobilier, magasins de meubles/bricolage grand public, etc.
  3. Localisation réelle (ville/région) dérivée du code postal de l'adresse, jamais de la ville de recherche.
  4. Filtre lexical sur le nom (cuisinistes grand public connus, enseignes nationales, commerces CHR).
  5. Déduplication contre prospects_pool (societe et téléphone), y compris les exclus.
  6. Sortie : data/cibles_v2_<date>.csv, à passer ensuite par le tri IA (critère non négociable) avant import.

Usage : python3 find_targets_v2.py [--regions "Île-de-France,Bretagne"] [--dry-run]
"""
import json, os, sys, urllib.request, time, csv, re, argparse
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from load_db import env, sql_exec
from import_pool import geo_from_adresse

# ---- Requêtes : formulées côté fournisseur, jamais côté restaurant ----
CATEGORIES = {
    "agenceur": [
        "agenceur de restaurants et bars",
        "agencement de commerces CHR",
        "aménagement de bar et brasserie professionnel",
    ],
    "materiel_cuisine": [
        "fournisseur matériel de cuisine professionnelle",
        "grossiste équipement CHR",
        "froid commercial professionnel restaurant",
        "matériel inox cuisine professionnelle",
    ],
    "caisse": [
        "caisse enregistreuse pour restaurant revendeur",
        "logiciel de caisse restaurant installateur",
    ],
    "enseigniste": [
        "enseigniste fabricant enseignes lumineuses",
        "enseignes et signalétique pour commerces",
    ],
    "mobilier": [
        "mobilier CHR professionnel",
        "fabricant mobilier restaurant bar hôtel",
        "mobilier terrasse professionnel restaurant",
    ],
    "hotte_ventilation": [
        "hotte professionnelle cuisine restaurant installation",
        "ventilation cuisine professionnelle",
    ],
    "vaisselle_arts_table": [
        "vaisselle professionnelle restaurant grossiste",
        "arts de la table professionnel CHR",
    ],
}

# ---- Villes : les 3 régions prioritaires en profondeur, le reste sur les métropoles ----
VILLES = {
    "Île-de-France": ["Paris", "Boulogne-Billancourt", "Nanterre", "Créteil", "Versailles", "Cergy", "Évry", "Melun", "Saint-Denis", "Argenteuil"],
    "Auvergne-Rhône-Alpes": ["Lyon", "Villeurbanne", "Grenoble", "Saint-Étienne", "Annecy", "Clermont-Ferrand", "Chambéry", "Valence", "Bourg-en-Bresse", "Roanne"],
    "Provence-Alpes-Côte d'Azur": ["Marseille", "Nice", "Toulon", "Aix-en-Provence", "Avignon", "Cannes", "Antibes", "Fréjus", "Gap", "Salon-de-Provence"],
    "Occitanie": ["Toulouse", "Montpellier", "Nîmes", "Perpignan", "Béziers"],
    "Nouvelle-Aquitaine": ["Bordeaux", "Bayonne", "La Rochelle", "Limoges", "Pau"],
    "Hauts-de-France": ["Lille", "Amiens", "Valenciennes", "Dunkerque"],
    "Grand Est": ["Strasbourg", "Reims", "Metz", "Nancy", "Mulhouse"],
    "Pays de la Loire": ["Nantes", "Angers", "Le Mans"],
    "Bretagne": ["Rennes", "Brest", "Vannes", "Quimper"],
    "Normandie": ["Rouen", "Caen", "Le Havre"],
    "Bourgogne-Franche-Comté": ["Dijon", "Besançon"],
    "Centre-Val de Loire": ["Tours", "Orléans"],
    "Corse": ["Ajaccio", "Bastia"],
}

FIELDS = ("places.displayName,places.nationalPhoneNumber,places.websiteUri,places.formattedAddress,"
          "places.rating,places.userRatingCount,places.businessStatus,places.types,places.primaryType")

# ---- Filtre 1 : types Google à rejeter (le lieu EST un commerce, pas un fournisseur) ----
BAD_TYPES = {
    "restaurant", "cafe", "bar", "bakery", "meal_takeaway", "meal_delivery", "food", "night_club", "coffee_shop",
    "pizza_restaurant", "fast_food_restaurant", "french_restaurant", "italian_restaurant", "hamburger_restaurant",
    "sandwich_shop", "ice_cream_shop", "pub", "wine_bar", "brunch_restaurant", "breakfast_restaurant",
    "lodging", "hotel", "real_estate_agency", "home_goods_store", "furniture_store", "hardware_store",
    "home_improvement_store", "department_store", "supermarket", "grocery_store", "shopping_mall",
    "interior_design", "kitchen_supply_store", "school", "hospital", "doctor", "dentist", "bank", "insurance_agency",
    "lawyer", "car_dealer", "car_repair", "gym", "beauty_salon", "hair_salon", "florist", "pharmacy",
}
# types "grand public" tolérés uniquement si le nom contient un marqueur pro
PRO_MARKERS = re.compile(r"\b(chr|pro\b|professionnel|professionnelle|grossiste|horeca|restauration collective|collectivit|inox|froid|hôtellerie|hotellerie|équipement|equipement|caisse|enseigne|signal[eé]tique|agencement|agenceur|mobilier)\b", re.I)

# ---- Filtre 2 : noms à rejeter (cuisinistes grand public, enseignes nationales, commerces) ----
BAD_NAMES = re.compile(
    r"\b(cuisinella|schmidt|mobalpa|ixina|aviva|arthur bonnet|cuisine plus|envia|perene|socoo.?c|raison home|"
    r"bulthaup|veneta|cuisines? r[eé]f[eé]rences|archea|but\b|castorama|leroy merlin|ikea|conforama|maisons du monde|"
    r"alin[eé]a|fermob|culinarion|bureau vall[eé]e|metro\b|promocash|"
    r"restaurant|brasserie|bistro|pizzeria|kebab|sushi|traiteur|boulangerie|p[aâ]tisserie|h[oô]tel\b|auberge|caf[eé]\b|bar à|"
    r"immobili|orpi|century|laforet|guy hoquet|foncia|nexity|notaire|avocat|banque|assurance|mairie)\b", re.I)

def search(query, max_results=20):
    key = env("GOOGLE_PLACES_KEY")
    req = urllib.request.Request(
        "https://places.googleapis.com/v1/places:searchText",
        data=json.dumps({"textQuery": query, "languageCode": "fr", "regionCode": "FR", "maxResultCount": max_results}).encode(),
        headers={"Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELDS}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            return json.loads(r.read().decode()).get("places", [])
    except Exception as e:
        print(f"  ERR {query[:50]}: {e}", file=sys.stderr)
        return []

def norm_tel(t):
    return re.sub(r"\D", "", t or "")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--regions", default=None, help="liste séparée par des virgules ; défaut = toutes")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--max-queries", type=int, default=0)
    args = ap.parse_args()

    regions = [r.strip() for r in args.regions.split(",")] if args.regions else list(VILLES.keys())

    # Déjà connus (pool actif + exclus) : on ne les re-propose jamais
    known = sql_exec("select societe, telephone from prospects_pool;")
    known_names = {re.sub(r"\W", "", (k["societe"] or "").lower())[:30] for k in known}
    known_tels = {norm_tel(k["telephone"]) for k in known if k["telephone"]}

    seen, rows = set(), []
    stats = {"brut": 0, "type_rejete": 0, "nom_rejete": 0, "deja_connu": 0, "sans_tel_ou_site": 0, "hors_fr": 0, "garde": 0}
    n_queries = 0
    for region in regions:
        for ville in VILLES.get(region, []):
            for cat, queries in CATEGORIES.items():
                for q in queries:
                    if args.max_queries and n_queries >= args.max_queries:
                        break
                    n_queries += 1
                    for p in search(f"{q} {ville}"):
                        stats["brut"] += 1
                        if p.get("businessStatus") not in (None, "OPERATIONAL"):
                            continue
                        name = (p.get("displayName") or {}).get("text", "")
                        types = set(p.get("types") or []); ptype = p.get("primaryType") or ""
                        if (types & BAD_TYPES or ptype in BAD_TYPES) and not PRO_MARKERS.search(name):
                            stats["type_rejete"] += 1; continue
                        if BAD_NAMES.search(name):
                            stats["nom_rejete"] += 1; continue
                        tel = p.get("nationalPhoneNumber", ""); site = p.get("websiteUri", "")
                        if not tel or not site:
                            stats["sans_tel_ou_site"] += 1; continue
                        key_dedup = re.sub(r"\W", "", name.lower())[:30]
                        if key_dedup in seen: continue
                        if key_dedup in known_names or norm_tel(tel) in known_tels:
                            stats["deja_connu"] += 1; seen.add(key_dedup); continue
                        addr = p.get("formattedAddress", "")
                        v_real, r_real = geo_from_adresse(addr)
                        if not r_real:
                            stats["hors_fr"] += 1; continue
                        seen.add(key_dedup)
                        stats["garde"] += 1
                        rows.append({
                            "societe": name, "categorie": cat, "region": r_real, "ville": v_real or ville,
                            "telephone": tel, "site_web": site, "adresse": addr,
                            "note_google": p.get("rating", ""), "nb_avis": p.get("userRatingCount", ""),
                            "types_google": "|".join(sorted(types))[:120], "requete": q, "ville_recherche": ville,
                        })
                    time.sleep(0.08)
            print(f"{region} / {ville}: cumul {len(rows)}", flush=True)

    out = os.path.join(HERE, "..", "data", f"cibles_v2_{date.today().isoformat()}.csv")
    if rows and not args.dry_run:
        with open(out, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=list(rows[0].keys()), delimiter=";")
            w.writeheader(); w.writerows(rows)
    print(f"\nDONE: {len(rows)} candidats ({n_queries} requêtes) -> {out}")
    print("Entonnoir:", stats)
    from collections import Counter
    print("Par catégorie:", dict(Counter(r["categorie"] for r in rows)))
    print("Par région:", dict(Counter(r["region"] for r in rows)))

if __name__ == "__main__":
    main()
