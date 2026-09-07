#!/usr/bin/env python3
"""LeBonProspect — pipeline d'ingestion BODACC.
Récupère les annonces 'Ventes et cessions', parse cédant/cessionnaire,
enrichit via recherche-entreprises.api.gouv.fr, classifie la verticale.

Usage:
  python3 ingest.py --date 2026-09-05          # un jour
  python3 ingest.py --from 2025-09-01 --to 2026-09-01  # backfill
  python3 ingest.py --date 2026-09-05 --no-enrich      # sans enrichissement
Sortie: JSON lines dans data/cessions/YYYY-MM-DD.jsonl
"""
import json, urllib.request, urllib.parse, time, argparse, os, sys, datetime, re

ODS = "https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records"
RECH = "https://recherche-entreprises.api.gouv.fr/search"
OUTDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "cessions")

VERTICALES = {
    "chr":        ["56.10", "56.21", "56.29", "56.30", "55.10"],
    "alimentaire":["47.11", "47.2", "10.71", "10.13"],
    "coiffure_beaute": ["96.02", "96.04"],
    "garage_auto":["45.1", "45.2", "45.3", "45.4"],
    "pressing_services": ["96.01", "96.09"],
    "sante":      ["47.73", "47.74", "86."],
    "fleuriste":  ["47.76"],
    "tabac_presse":["47.26", "47.62"],
}

def classify(naf: str) -> str:
    if not naf:
        return "inconnu"
    for vert, prefixes in VERTICALES.items():
        if any(naf.startswith(p) for p in prefixes):
            return vert
    return "autres"

def http_json(url: str, retries: int = 3):
    for i in range(retries):
        try:
            with urllib.request.urlopen(url, timeout=30) as r:
                return json.loads(r.read().decode())
        except Exception:
            if i == retries - 1:
                raise
            time.sleep(1.5 * (i + 1))

def parse_personnes(raw):
    """listepersonnes est un JSON string {'personne': {...}} ou {'personne': [{...},...]}"""
    if not raw:
        return []
    try:
        data = json.loads(raw) if isinstance(raw, str) else raw
    except json.JSONDecodeError:
        return []
    p = data.get("personne", [])
    return p if isinstance(p, list) else [p]

def clean_siren(s):
    if not s:
        return None
    d = re.sub(r"\D", "", str(s))
    return d[:9] if len(d) >= 9 else None

def _flat(v):
    """BODACC XML→JSON: les champs peuvent être str, list ou dict."""
    if v is None:
        return None
    if isinstance(v, list):
        return " ".join(str(x) for x in v if x)
    if isinstance(v, dict):
        return " ".join(str(x) for x in v.values() if x)
    return str(v)

def person_summary(p):
    num = ((p.get("numeroImmatriculation") or {}).get("numeroIdentification"))
    addr = p.get("adresseSiegeSocial") or p.get("adresse") or {}
    if isinstance(addr, list):
        addr = addr[0] if addr else {}
    nom_perso = " ".join(filter(None, [_flat(p.get("prenom")), _flat(p.get("nom"))]))
    return {
        "type": p.get("typePersonne"),
        "denomination": _flat(p.get("denomination")) or nom_perso or None,
        "forme": _flat(p.get("formeJuridique")),
        "siren": clean_siren(num),
        "admin": _flat(p.get("administration")),
        "adresse": ", ".join(str(v) for v in [addr.get("numeroVoie"), addr.get("typeVoie"),
                     addr.get("nomVoie"), addr.get("codePostal"), addr.get("ville")] if v),
    }

def fetch_day(day: str):
    """Toutes les annonces Ventes et cessions publiées ce jour (pagination)."""
    out, offset = [], 0
    while True:
        w = f'familleavis_lib="Ventes et cessions" AND dateparution=date\'{day}\''
        p = urllib.parse.urlencode({"where": w, "limit": 100, "offset": offset,
            "select": "id,dateparution,typeavis_lib,commercant,ville,cp,registre,tribunal,"
                      "listepersonnes,acte,departement_nom_officiel,region_nom_officiel"})
        d = http_json(ODS + "?" + p)
        rows = d.get("results", [])
        out += rows
        offset += 100
        if offset >= min(d.get("total_count", 0), 9900) or not rows:
            break
        time.sleep(0.12)
    return out

def enrich_siren(siren: str, cache: dict):
    if not siren or siren in cache:
        return cache.get(siren)
    try:
        d = http_json(f"{RECH}?q={siren}&per_page=1&page=1")
        res = d.get("results", [])
        if res:
            r = res[0]
            dirigeants = [f"{x.get('prenoms','')} {x.get('nom','')}".strip()
                          for x in (r.get("dirigeants") or []) if x.get("nom")][:3]
            cache[siren] = {
                "naf": r.get("activite_principale"),
                "nom_complet": r.get("nom_complet"),
                "date_creation": r.get("date_creation"),
                "dirigeants": dirigeants,
                "siege_adresse": (r.get("siege") or {}).get("adresse"),
            }
        else:
            cache[siren] = None
    except Exception:
        cache[siren] = None
    time.sleep(0.13)
    return cache[siren]

def process_day(day: str, enrich: bool = True, cache: dict = None):
    cache = cache if cache is not None else {}
    rows = fetch_day(day)
    out = []
    for r in rows:
        personnes = [person_summary(p) for p in parse_personnes(r.get("listepersonnes"))]
        acte = {}
        try:
            acte = json.loads(r["acte"]) if r.get("acte") else {}
        except (json.JSONDecodeError, TypeError):
            pass
        sirens = [clean_siren(x) for x in (r.get("registre") or [])]
        sirens = list(dict.fromkeys([s for s in sirens if s]))
        # convention BODACC observée: registre = [SIREN acheteur..., SIREN vendeur...]
        # le 1er SIREN correspond à la personne en tête de listepersonnes (cessionnaire/acheteur)
        acheteur_siren = personnes[0]["siren"] if personnes and personnes[0].get("siren") else (sirens[0] if sirens else None)
        vendeur_siren = next((s for s in sirens if s != acheteur_siren), None)
        rec = {
            "bodacc_id": r.get("id"),
            "date_parution": r.get("dateparution"),
            "type_avis": r.get("typeavis_lib"),
            "commercant": r.get("commercant"),
            "ville": r.get("ville"), "cp": r.get("cp"),
            "departement": r.get("departement_nom_officiel"),
            "region": r.get("region_nom_officiel"),
            "tribunal": r.get("tribunal"),
            "personnes": personnes,
            "acheteur_siren": acheteur_siren,
            "vendeur_siren": vendeur_siren,
            "acte_descriptif": (acte.get("descriptif") or "")[:600] or None,
        }
        if enrich:
            v_info = enrich_siren(vendeur_siren, cache)  # NAF du fonds cédé = activité du VENDEUR
            a_info = enrich_siren(acheteur_siren, cache)
            rec["vendeur_info"] = v_info
            rec["acheteur_info"] = a_info
            naf_fonds = (v_info or {}).get("naf") if v_info else None
            if not naf_fonds or naf_fonds == "00.00Z":
                naf_fonds = (a_info or {}).get("naf") if a_info else None
            rec["naf_fonds"] = naf_fonds
            rec["verticale"] = classify(naf_fonds or "")
        out.append(rec)
    return out

def save_day(day: str, records):
    os.makedirs(OUTDIR, exist_ok=True)
    path = os.path.join(OUTDIR, f"{day}.jsonl")
    with open(path, "w") as f:
        for r in records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    return path

def enrich_existing(day: str, cache: dict):
    """Enrichit un JSONL déjà téléchargé (backfill) et le réécrit sur place."""
    path = os.path.join(OUTDIR, f"{day}.jsonl")
    if not os.path.exists(path):
        return 0, 0
    rows = [json.loads(l) for l in open(path) if l.strip()]
    changed = 0
    for r in rows:
        if r.get("verticale") not in (None, "", "inconnu"):
            continue
        v_info = enrich_siren(r.get("vendeur_siren"), cache)
        a_info = enrich_siren(r.get("acheteur_siren"), cache)
        r["vendeur_info"], r["acheteur_info"] = v_info, a_info
        naf = (v_info or {}).get("naf") if v_info else None
        if not naf or naf == "00.00Z":
            naf = (a_info or {}).get("naf") if a_info else None
        r["naf_fonds"] = naf
        r["verticale"] = classify(naf or "")
        changed += 1
    if changed:
        with open(path, "w") as f:
            for r in rows:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
    return len(rows), changed

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--date")
    ap.add_argument("--from", dest="dfrom")
    ap.add_argument("--to", dest="dto")
    ap.add_argument("--no-enrich", action="store_true")
    ap.add_argument("--enrich-existing", action="store_true",
                    help="enrichit les JSONL locaux existants au lieu de re-télécharger")
    args = ap.parse_args()
    days = []
    if args.date:
        days = [args.date]
    elif args.dfrom and args.dto:
        d0 = datetime.date.fromisoformat(args.dfrom)
        d1 = datetime.date.fromisoformat(args.dto)
        days = [(d0 + datetime.timedelta(n)).isoformat() for n in range((d1 - d0).days)]
    else:
        days = [(datetime.date.today() - datetime.timedelta(1)).isoformat()]
    cache = {}
    if args.enrich_existing:
        total_rows = total_changed = 0
        for day in days:
            n, ch = enrich_existing(day, cache)
            total_rows += n; total_changed += ch
            if ch:
                print(f"{day}: {ch}/{n} enrichis (cache: {len(cache)} SIREN)", flush=True)
        print(f"DONE: {total_changed} annonces enrichies sur {total_rows}")
        sys.exit(0)
    for day in days:
        recs = process_day(day, enrich=not args.no_enrich, cache=cache)
        path = save_day(day, recs)
        n_v = sum(1 for r in recs if r.get("verticale") not in (None, "inconnu", "autres"))
        print(f"{day}: {len(recs)} cessions → {path}" + (f" ({n_v} verticalisées)" if not args.no_enrich else ""))
