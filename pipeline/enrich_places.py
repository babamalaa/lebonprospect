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
import json, os, sys, argparse, urllib.request, time, re, datetime, unicodedata, difflib

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from load_db import sql_exec, env

VENDABLES = ("chr", "alimentaire", "coiffure_beaute", "garage_auto",
             "pressing_services", "sante", "fleuriste", "tabac_presse")

def places_search_n(query, n=5):
    """Jusqu'à n lieux candidats (le premier n'est pas toujours le bon : on valide ensuite)."""
    key = env("GOOGLE_PLACES_KEY")
    req = urllib.request.Request(
        "https://places.googleapis.com/v1/places:searchText",
        data=json.dumps({"textQuery": query, "languageCode": "fr", "regionCode": "FR", "maxResultCount": n}).encode(),
        headers={"Content-Type": "application/json", "X-Goog-Api-Key": key,
                 "X-Goog-FieldMask": "places.displayName,places.nationalPhoneNumber,places.formattedAddress,places.types,places.primaryType,places.businessStatus"},
        method="POST")
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.loads(r.read().decode()).get("places") or []
    except Exception:
        return []

def places_search(query):
    key = env("GOOGLE_PLACES_KEY")
    req = urllib.request.Request(
        "https://places.googleapis.com/v1/places:searchText",
        data=json.dumps({"textQuery": query, "languageCode": "fr",
                         "regionCode": "FR", "maxResultCount": 1}).encode(),
        headers={"Content-Type": "application/json",
                 "X-Goog-Api-Key": key,
                 "X-Goog-FieldMask": "places.displayName,places.nationalPhoneNumber,places.formattedAddress,places.types,places.primaryType"},
        method="POST")
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            d = json.loads(r.read().decode())
        return (d.get("places") or [None])[0]
    except Exception:
        return None

# Un numéro de mairie, de poste ou d'administration n'est JAMAIS celui du commerce repris (cas MG2P, Charleville-Mézières :
# la recherche s'accrochait à l'adresse « place de l'Hôtel de Ville »). On refuse ces lieux plutôt que d'envoyer un faux numéro.
TYPES_PUBLICS = {"city_hall", "local_government_office", "government_office", "courthouse", "police", "post_office", "embassy",
                 "fire_station", "library", "school", "primary_school", "secondary_school", "university", "hospital", "town_square"}
NOMS_PUBLICS = re.compile(
    r"^(mairie|hôtel de ville|hotel de ville|la poste|bureau de poste|agence postale|centre des finances|préfecture|sous-préfecture|"
    r"tribunal|palais de justice|gendarmerie|police municipale|commissariat|cpam|caf( |$)|pôle emploi|france travail|"
    r"communauté de communes|communauté d.agglomération|office de tourisme|trésor public|service des impôts|sdis|caserne|"
    r"médiathèque|bibliothèque|école|collège|lycée|centre hospitalier|hôpital|ccas|cci( |$)|chambre d)", re.I)

def lieu_public(place):
    """True si le lieu renvoyé par Google est un bâtiment public ou administratif, pas un commerce."""
    if not place: return False
    nom = (place.get("displayName") or {}).get("text", "")
    types = set(place.get("types") or []) | {place.get("primaryType")}
    return bool(NOMS_PUBLICS.search(nom.strip())) or bool(types & TYPES_PUBLICS)

# ---------------------------------------------------------------------------------------------------------------------
# VALIDATION D'UN LIEU GOOGLE. Cas qui ont motivé cette règle (5 oct. 2026) : la recherche partait du nom du VENDEUR avec l'adresse du
# REPRENEUR, et Google renvoyait « ce qui est à côté » : un burger devenait « Lexus Lyon Sud », un restaurant un garage, Ji&Jo un voisin.
# Principe : un mauvais numéro est pire que pas de numéro. On n'accepte que ce que Google CONFIRME.
# ---------------------------------------------------------------------------------------------------------------------
STOP_NOM = {"sas", "sarl", "sasu", "eurl", "sci", "snc", "scop", "scic", "societe", "ste", "restaurant", "restaurants", "resto", "cafe", "bar",
            "brasserie", "hotel", "boulangerie", "patisserie", "pharmacie", "garage", "salon", "coiffure", "maison", "chez", "les", "des", "du",
            "de", "la", "le", "et", "the", "and", "food", "foods", "pizza", "pizzeria", "kebab", "tabac", "presse", "commerce", "fonds",
            "groupe", "holding", "france", "auto", "automobiles", "services", "service"}
GEN_VOIE = {"rue", "avenue", "boulevard", "route", "place", "chemin", "impasse", "allee", "cours", "quai", "zone", "zac", "lieu", "dit",
            "bis", "ter", "residence", "batiment", "pl", "rte", "av", "bd", "che", "imp"}
TYPES_CHR = {"restaurant", "cafe", "bar", "bar_and_grill", "pub", "food", "meal_takeaway", "meal_delivery", "bakery", "lodging", "hotel",
             "night_club", "bistro", "coffee_shop", "sandwich_shop", "pizza_restaurant", "fast_food_restaurant", "tea_house", "ice_cream_shop",
             "wine_bar", "brunch_restaurant", "caterer", "catering_service", "bed_and_breakfast", "guest_house", "motel", "campground", "resort_hotel"}

def _norm(t):
    t = unicodedata.normalize("NFKD", t or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9 ]", " ", t)

def _tokens(t, exclure=frozenset()):
    mots = {w for w in _norm(t).split() if len(w) >= 3 and w not in STOP_NOM and w not in exclure and not w.isdigit()}
    # un nombre de 3 chiffres ou plus (« 2001 », « 421 ») est un vrai signe distinctif de marque ; un petit numéro (« 2 ») n'en est pas un
    return mots | {w for w in _norm(t).split() if w.isdigit() and len(w) >= 3 and w not in exclure}

def noms_similaires(a, b, exclure=frozenset()):
    """Deux noms se ressemblent s'ils partagent un mot distinctif. `exclure` : mots de la commune, qui ne prouvent rien."""
    ta, tb = _tokens(a, exclure), _tokens(b, exclure)
    if ta and tb and (ta & tb):
        return True
    na, nb = _norm(a).replace(" ", ""), _norm(b).replace(" ", "")
    return len(na) >= 5 and len(nb) >= 5 and difflib.SequenceMatcher(None, na, nb).ratio() >= 0.8

def noms_repreneur(row):
    """Noms sous lesquels le REPRENEUR peut être trouvé : enseigne entre parenthèses, nom de la société, premier segment du BODACC.
    Le nom du vendeur est exclu : c'est l'ancien propriétaire, pas le commerce actuel."""
    vend = _norm(row.get("vendeur_nom"))
    ach = row.get("acheteur_nom") or ""
    out = []
    m = re.search(r"\(([^)]+)\)", ach)
    if m: out.append(m.group(1).strip())
    base = re.sub(r"\([^)]*\)", "", ach).strip()
    if base: out.append(base)
    seg = ((row.get("commercant") or "").split(",")[0]).strip()
    if seg: out.append(re.sub(r"\([^)]*\)", "", seg).strip())
    res, vus = [], set()
    for n in out:
        k = _norm(n).strip()
        if n and k and k not in vus and k != vend.strip():
            vus.add(k); res.append(n)
    return res

def _cp(texte):
    m = re.findall(r"(\d{5})", texte or "")
    return m[-1] if m else None

def _num_voie(adresse):
    """(ensemble de numéros, mots distinctifs de la voie). Gère « 19 A » / « 19A » / « 19 bis », « 81-83 », « 2 B »."""
    a = (adresse or "").replace("\u2013", "-")
    m = re.search(r"(\d+)(?:\s*(?:-|a|à|et)\s*(\d+))?\s*(?:bis|ter|quater|[a-d])?\b[ ,]*([^\d,]+?)\s*(?:\d{1,3}\s*)?,?\s*\d{5}", a, re.I)
    if not m: return None
    nums = {m.group(1)} | ({m.group(2)} if m.group(2) else set())
    if m.group(2) and 0 < int(m.group(2)) - int(m.group(1)) <= 40:
        nums |= {str(n) for n in range(int(m.group(1)), int(m.group(2)) + 1)}
    voie = {w for w in _norm(m.group(3)).split() if len(w) > 3 and w not in GEN_VOIE}
    return (nums, voie) if voie else None

def meme_adresse(adr_repreneur, adr_google):
    a, b = _num_voie(adr_repreneur), _num_voie(adr_google)
    return bool(a and b and (a[0] & b[0]) and (a[1] & b[1]))

# Types Google attendus selon le métier du repreneur. Sert à refuser « le voisin de palier » (Intermarché pour une coiffeuse en galerie,
# « Eat Night » pour un fruitier, un centre d'affaires pour un artisan) quand seule l'adresse concorde.
TYPES_PAR_VERTICALE = {
    "chr": TYPES_CHR,
    "coiffure_beaute": {"hair_salon", "hair_care", "beauty_salon", "barber_shop", "spa", "nail_salon", "beauty_supply_store", "massage"},
    "alimentaire": {"bakery", "butcher_shop", "grocery_store", "supermarket", "food_store", "convenience_store", "liquor_store", "meal_takeaway",
                    "market", "store", "wine_store", "delicatessen", "fruit_and_vegetable_store", "farm_shop", "food_store"},
    "sante": {"health", "pharmacy", "doctor", "dentist", "physiotherapist", "medical_lab", "hearing_aid_store", "drugstore", "veterinary_care", "optician", "hospital"},
    "garage_auto": {"car_repair", "car_dealer", "car_wash", "auto_parts_store", "gas_station", "car_rental", "tire_shop", "motorcycle_repair"},
    "tabac_presse": {"convenience_store", "book_store", "newsstand", "tobacco_shop", "liquor_store", "cafe", "bar", "store"},
    "fleuriste": {"florist", "store", "garden_center"},
    "pressing_services": {"laundry", "dry_cleaning", "locksmith", "store", "point_of_interest"},
}

def type_coherent(place, verticale):
    """True si le type du lieu Google est cohérent avec le métier. Métier inconnu ou non listé : pas de preuve de désaccord, donc True."""
    attendu = TYPES_PAR_VERTICALE.get(verticale)
    if not attendu:
        return True
    types = set(place.get("types") or []) | {place.get("primaryType")}
    return any((t in attendu) or (verticale == "chr" and (t or "").endswith("_restaurant")) for t in types if t)

def type_compatible(place, verticale):
    """Un CHR doit être un lieu de restauration / hébergement : jamais une concession, un garage ou un bureau dans le même bâtiment."""
    if verticale != "chr":
        return True
    types = set(place.get("types") or []) | {place.get("primaryType")}
    return any(t in TYPES_CHR or (t or "").endswith("_restaurant") for t in types if t)

def noms_vendeur(row):
    """Nom du fonds vendu : parfois c'est le vrai nom du commerce (« Art et Coupe » repris par Poindront), mais jamais une preuve à lui seul."""
    out = []
    for src in (row.get("vendeur_nom"), ((row.get("commercant") or "").split(",") + [""])[1] if "," in (row.get("commercant") or "") else ""):
        n = re.sub(r"\([^)]*\)", "", src or "").strip()
        if n: out.append(n)
    return out

def valider_lieu(place, row):
    """(True, raison) si Google CONFIRME que ce lieu est l'établissement du repreneur ; (False, raison) sinon."""
    if not place or not place.get("nationalPhoneNumber"):
        return False, "pas de numéro"
    if place.get("businessStatus") in ("CLOSED_PERMANENTLY",):
        return False, "fermé définitivement"
    if lieu_public(place):
        return False, "bâtiment public"
    adr_g = place.get("formattedAddress") or ""
    cp_attendu = _cp(row.get("acheteur_adresse")) or (re.findall(r"(\d{5})", row.get("cp") or "") or [None])[0]
    if not cp_attendu or _cp(adr_g) != cp_attendu:
        return False, "autre commune"
    if not type_compatible(place, row.get("verticale")):
        return False, "type de lieu incompatible"
    nom_g = (place.get("displayName") or {}).get("text", "")
    ville_mots = set(_norm(" ".join(filter(None, [(row.get("ville") or "").split(",")[0], adr_g.split(",")[-1] if adr_g else ""]))).split())
    ville_mots |= set(_norm(re.sub(r"\d{5}", " ", (row.get("acheteur_adresse") or "").split("  ")[-1])).split()[-3:])
    if any(noms_similaires(nom_g, n, ville_mots) for n in noms_repreneur(row)):
        return True, "nom du repreneur"
    # Nom du fonds vendu retrouvé À LA MÊME ADRESSE (même numéro de voie) et pour le même métier : le commerce a changé de mains sans changer de nom
    if meme_adresse(row.get("acheteur_adresse"), adr_g) and type_coherent(place, row.get("verticale")) and row.get("verticale") not in ("autres", "inconnu", None) \
            and any(noms_similaires(nom_g, n, ville_mots) for n in noms_vendeur(row)):
        return True, "nom du fonds vendu, même adresse"
    # À l'adresse seule : exige un type de lieu cohérent avec le métier ET un numéro de voie identique (jamais le voisin de palier).
    if meme_adresse(row.get("acheteur_adresse"), adr_g) and type_coherent(place, row.get("verticale")) and row.get("verticale") not in ("autres", "inconnu", None):
        return True, "même adresse et même métier"
    # Adresse sans numéro de voie (lieu-dit : « La Mouge, RN 6 ») : même commune + même lieu-dit + même type de lieu -> on accepte
    if not _num_voie(row.get("acheteur_adresse")) and type_coherent(place, row.get("verticale")) and row.get("verticale") not in ("autres", "inconnu", None):
        lieu_dit = {w for w in _norm((row.get("acheteur_adresse") or "")).split() if len(w) > 3 and w not in GEN_VOIE and not w.isdigit()} - {w for w in _norm(row.get("ville") or "").split()}
        if lieu_dit & set(_norm(adr_g).split()) and not (set(place.get("types") or []) & {"shopping_mall", "department_store", "supermarket", "hypermarket", "business_center"}) \
                and not re.search(r"centre commercial|galerie|carrefour|leclerc|auchan|intermarch|casino|zone|zac|parc d", nom_g, re.I):
            return True, "même lieu-dit et même métier"
    return False, "ni le nom ni l'adresse"

def trouver_lieu(row):
    """Cherche l'établissement du repreneur ; retourne (lieu, raison) ou (None, motif). Jusqu'à 3 requêtes, arrêt au premier lieu validé."""
    adr = (row.get("acheteur_adresse") or "").strip()
    ville = (row.get("ville") or "").split(",")[0].strip()
    lieu_txt = adr or ville
    requetes = [f"{n} {lieu_txt}" for n in noms_repreneur(row)[:2]]
    if row.get("verticale") == "chr" and adr:
        requetes.append(f"restaurant bar café {adr}")          # dernier recours : ce qui se trouve à l'adresse, validé par le type
    dernier = "aucune requête"
    for q in requetes[:3]:
        for place in places_search_n(q, 5):
            ok, why = valider_lieu(place, row)
            if ok:
                return place, why
            dernier = why
        time.sleep(0.05)
    return None, dernier

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
    ap.add_argument("--depts", help="départements séparés par | (avec --reverifier)")
    ap.add_argument("--reverifier", action="store_true", help="re-vérifie les numéros déjà en base avec la règle stricte (l'ancien est conservé dans telephone_ancien)")
    args = ap.parse_args()
    conds = ["telephone is null", "enrichi_places = false"] if not args.reverifier else ["(telephone is not null or enrichi_places = true)", "tel_validation is null"]
    if args.depts:
        dl = ",".join("'" + d.strip().replace("'", "''") + "'" for d in args.depts.split("|") if d.strip())
        conds.append(f"departement in ({dl})")
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
    rows = sql_exec(f"select id, bodacc_id, commercant, ville, cp, vendeur_nom, acheteur_nom, acheteur_adresse, verticale, telephone "
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
    esc = lambda t: (t or "").replace("'", "''")
    rejetes = 0
    for i, row in enumerate(rows):
        place, raison = trouver_lieu(row)
        if place:
            tel = place["nationalPhoneNumber"]
            pname = esc((place.get("displayName") or {}).get("text", ""))
            padr = esc(place.get("formattedAddress"))
            pending.append((row['id'], f"telephone = '{tel}', telephone_confiance = '{confiance(tel)}', place_name = '{pname}', place_adresse = '{padr}', "
                                       f"tel_validation = '{esc(raison)}', enrichi_places = true, places_tentatives = places_tentatives + 1"))
            found += 1
        else:
            ancien = f", telephone_ancien = coalesce(telephone_ancien, telephone)" if row.get("telephone") else ""
            if row.get("telephone"): rejetes += 1
            pending.append((row['id'], f"telephone = null, telephone_confiance = null{ancien}, tel_validation = 'rejete : {esc(raison)}', "
                                       f"enrichi_places = true, places_tentatives = places_tentatives + 1"))
        if len(pending) >= 25: flush()
        if (i + 1) % 50 == 0:
            print(f"  {i+1}/{len(rows)} traités, {found} numéros validés", flush=True)
        time.sleep(0.06)
    flush()
    print(f"DONE: {found}/{len(rows)} numéros validés ({100*found/max(len(rows),1):.0f}%)" + (f" · {rejetes} anciens numéros écartés" if args.reverifier else ""))

if __name__ == "__main__":
    main()
