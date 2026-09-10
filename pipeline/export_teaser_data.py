#!/usr/bin/env python3
"""Exporte les données teasers (top 30 cibles + leads + stats par région)
vers site/data/teasers.json — consommé par les pages /pour/[slug] du site.
Relancer après chaque mise à jour de la base ou du top30 pour rafraîchir.
"""
import os, sys, csv, json, re, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from load_db import sql_exec

REGION_MAP = {"Île-de-France": "Île-de-France", "PACA": "Provence-Alpes-Côte d'Azur",
              "Auvergne-Rhône-Alpes": "Auvergne-Rhône-Alpes"}
CAT_LABELS = {
    "agenceur": "l'agencement CHR",
    "materiel_cuisine": "l'équipement de cuisine professionnelle",
    "caisse": "les solutions d'encaissement",
    "enseigniste": "l'enseigne et la signalétique",
    "mobilier": "le mobilier professionnel",
}

def slug(s):
    s = s.lower()
    for a, b in [("é","e"),("è","e"),("ê","e"),("à","a"),("ç","c"),("ô","o"),("î","i"),("û","u"),("ë","e"),("ï","i")]:
        s = s.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:40]

def mask_tel(tel):
    parts = tel.split(" ")
    if len(parts) >= 5:
        return " ".join(parts[:3] + ["## ##"])
    return tel[:-5] + " ## ##"

def clean_dirigeants(dirigeants):
    if isinstance(dirigeants, str):
        dirigeants = [d.strip() for d in dirigeants.strip("{}").split(",") if d.strip()]
    out = []
    for d in (dirigeants or [])[:2]:
        d = re.sub(r"\s*\([^)]*\)", "", d).strip().title()
        if d:
            out.append(d)
    return out

def region_payload(region):
    stats = sql_exec(f"""select count(*) filter (where date_parution >= current_date - 90) as n90,
        count(*) filter (where date_parution >= current_date - 30) as n30,
        count(*) filter (where date_parution >= current_date - 90 and telephone is not null) as n90_tel
        from cessions where verticale = 'chr' and region = '{region.replace(chr(39), chr(39)*2)}';""")[0]
    rows = sql_exec(f"""select * from cessions where verticale = 'chr'
        and region = '{region.replace(chr(39), chr(39)*2)}' and acheteur_nom is not null
        order by date_parution desc limit 12;""")
    rows.sort(key=lambda r: (r.get("telephone") is None,))
    leads = []
    today = datetime.date.today()
    for r in rows[:6]:
        creation = r.get("acheteur_date_creation")
        fresh = None
        if creation:
            age = (today - datetime.date.fromisoformat(str(creation))).days
            fresh = "budgets ouverts" if age <= 180 else "en expansion"
        leads.append({
            "nom": r.get("place_name") or r.get("acheteur_nom") or r.get("commercant") or "",
            "ville": (r.get("ville") or "").split(",")[0],
            "dept": r.get("departement") or "",
            "date": str(r.get("date_parution") or ""),
            "dirigeants": clean_dirigeants(r.get("acheteur_dirigeants")),
            "tel_masque": mask_tel(r["telephone"]) if r.get("telephone") else None,
            "badge": fresh,
        })
    # top départements de la région (pour le bloc "vos secteurs")
    depts = sql_exec(f"""select departement, count(*) n from cessions
        where verticale = 'chr' and region = '{region.replace(chr(39), chr(39)*2)}'
        and date_parution >= current_date - 90 group by 1 order by n desc limit 5;""")
    return {"n90": stats["n90"], "n30": stats["n30"], "n90_tel": stats["n90_tel"],
            "pct_tel": round(100 * stats["n90_tel"] / max(stats["n90"], 1)),
            "leads": leads,
            "depts": [{"nom": d["departement"], "n": d["n"]} for d in depts]}

def main():
    national = sql_exec("""select count(*) filter (where date_parution >= current_date - 90) as n90
        from cessions where verticale = 'chr';""")[0]
    cibles, regions = [], {}

    # source unique désormais : la table prospects_calls (alimentée par subscribe/refill)
    rows = sql_exec("select societe, categorie, region, ville from prospects_calls order by id;")
    for row in rows:
        region = REGION_MAP.get(row["region"], row["region"])
        if region not in regions:
            print(f"stats {region}...", flush=True)
            regions[region] = region_payload(region)
        cibles.append({
            "slug": slug(row["societe"]),
            "societe": row["societe"],
            "categorie": row["categorie"],
            "metier": CAT_LABELS.get(row["categorie"], "votre métier"),
            "region": region,
            "ville": row["ville"],
        })
    out = {
        "genere_le": datetime.date.today().isoformat(),
        "national_n90": national["n90"],
        "regions": regions,
        "cibles": cibles,
    }
    dest = os.path.join(HERE, "..", "site", "data", "teasers.json")
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "w") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(f"DONE: {len(cibles)} cibles, {len(regions)} régions → {dest}")

if __name__ == "__main__":
    main()
