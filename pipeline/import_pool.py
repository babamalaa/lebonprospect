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

# La ville/region de recherche Google Maps n'est PAS la localisation reelle du prospect
# (ex : "CHR Discount OI" trouve en cherchant Clermont-Ferrand, mais base a La Reunion).
# On derive ville et region du code postal de l'adresse reelle quand elle est disponible.
_DEPS = {
    "Île-de-France": ["75","77","78","91","92","93","94","95"],
    "Auvergne-Rhône-Alpes": ["01","03","07","15","26","38","42","43","63","69","73","74"],
    "Provence-Alpes-Côte d'Azur": ["04","05","06","13","83","84"],
    "Occitanie": ["09","11","12","30","31","32","34","46","48","65","66","81","82"],
    "Nouvelle-Aquitaine": ["16","17","19","23","24","33","40","47","64","79","86","87"],
    "Bretagne": ["22","29","35","56"], "Pays de la Loire": ["44","49","53","72","85"],
    "Normandie": ["14","27","50","61","76"], "Centre-Val de Loire": ["18","28","36","37","41","45"],
    "Hauts-de-France": ["02","59","60","62","80"], "Grand Est": ["08","10","51","52","54","55","57","67","68","88"],
    "Bourgogne-Franche-Comté": ["21","25","39","58","70","71","89","90"], "Corse": ["20","2A","2B"],
}
DEP2REG = {d: reg for reg, ds in _DEPS.items() for d in ds}
DOM = {"971": "Guadeloupe", "972": "Martinique", "973": "Guyane", "974": "La Réunion", "976": "Mayotte"}

def geo_from_adresse(adresse):
    """Retourne (ville, region) depuis une adresse contenant un code postal, sinon (None, None)."""
    if not adresse:
        return None, None
    m = re.search(r"\b(\d{5})\b", adresse)
    if not m:
        return None, None
    cp = m.group(1)
    region = DOM.get(cp[:3]) or DEP2REG.get(cp[:2])
    ville = None
    m2 = re.search(r"([A-Za-zÀ-ÿ'’\-\s\(\)]+?)\s+" + cp + r"\b", adresse)
    if m2:
        ville = m2.group(1).split(",")[-1].strip()
    else:
        m3 = re.search(cp + r"\s*,?\s*([^,]+)", adresse)
        if m3:
            ville = m3.group(1).strip()
    if ville:
        ville = re.sub(r"\s*\(Le\b", "", ville).strip()
    return ville, region

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
        ville = r["ville_recherche"]
        v_adr, r_adr = geo_from_adresse(r.get("adresse", ""))
        if r_adr:
            region = r_adr
            ville = v_adr or ville
        lien = f"https://www.lebonprospect.fr/pour/{slug(r['societe'])}"
        avis = to_int(r["nb_avis"])
        sql_exec(f"""insert into prospects_pool
            (societe, categorie, region, ville, telephone, type_num, site_web, nb_avis, lien_teaser, statut)
            values ('{esc(r['societe'])}', '{esc(r['categorie'])}', '{esc(region)}',
            '{esc(ville)}', '{esc(r['telephone'])}',
            '{esc("mobile" if r['telephone'].replace(" ","").startswith(("06","07")) else "fixe")}',
            '{esc(r['site_web'])}', {avis}, '{esc(lien)}', 'a_contacter')
            on conflict (societe) do nothing;""")
        n += 1
    print(f"DONE: {n} prospects tentés (doublons ignorés via unique societe)")

if __name__ == "__main__":
    main()
