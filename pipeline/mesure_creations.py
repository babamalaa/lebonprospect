#!/usr/bin/env python3
"""Mesure (lecture seule) : créations de commerces des 30 derniers jours dans les 5 départements de l'essai Verisure.
Étape 1 : avis BODACC « Créations » -> lignes ; étape 2 : NAF officiel via l'annuaire des entreprises (reprise si interrompu)."""
import json, re, time, os, sys, urllib.request

SRC, OUT = "/tmp/creations_5dep.json", "/tmp/creations_rows.json"

def J(v): return json.loads(v) if isinstance(v, str) else (v or {})
def lst(x): return x if isinstance(x, list) else ([x] if x else [])

def lignes():
    rows = []
    for x in json.load(open(SRC)):
        p = lst(J(x.get("listepersonnes")).get("personne"))[0]
        e = (lst(J(x.get("listeetablissements")).get("etablissement")) or [{}])[0]
        a = e.get("adresse") or p.get("adresseSiegeSocial") or {}
        if isinstance(a, list): a = a[0] if a else {}
        siren = re.sub(r"\D", "", (p.get("numeroImmatriculation") or {}).get("numeroIdentification") or "")[:9]
        prenom = " ".join(lst(p.get("prenom"))) if p.get("prenom") else None
        rows.append({"bodacc_id": x["id"], "date": x["dateparution"], "dep": x["numerodepartement"], "siren": siren,
                     "type": p.get("typePersonne"), "nom": p.get("denomination") or " ".join(filter(None, [prenom, p.get("nom")])),
                     "nom_commercial": p.get("nomCommercial"), "enseigne": e.get("enseigne"), "activite": (e.get("activite") or "")[:300],
                     "qualite": e.get("qualiteEtablissement"),
                     "sans_activite": "sans activité" in ((J(x.get("acte")).get("creation") or {}).get("categorieCreation") or ""),
                     "num": a.get("numeroVoie"), "voie": " ".join(filter(None, [a.get("typeVoie"), a.get("nomVoie")])),
                     "compl": a.get("complGeographique"), "cp": a.get("codePostal"), "ville": a.get("ville")})
    return rows

def main():
    rows = json.load(open(OUT)) if os.path.exists(OUT) else lignes()
    todo = [r for r in rows if r["siren"] and "naf" not in r]
    print(f"{len(rows)} créations, {len(todo)} NAF à chercher", flush=True)
    for i, r in enumerate(todo):
        for essai in range(4):
            try:
                req = urllib.request.Request(f"https://recherche-entreprises.api.gouv.fr/search?q={r['siren']}&per_page=1", headers={"User-Agent": "lebonprospect-mesure"})
                d = json.load(urllib.request.urlopen(req, timeout=20))
                res = (d.get("results") or [None])[0] or {}
                r["naf"] = res.get("activite_principale")
                r["dirigeants"] = [f"{x.get('prenoms','')} {x.get('nom','')}".strip() for x in (res.get("dirigeants") or []) if x.get("nom")][:2]
                break
            except urllib.error.HTTPError as e:
                time.sleep(3 * (essai + 1) if e.code == 429 else 1)
            except Exception:
                time.sleep(2)
        time.sleep(0.16)                       # ~6 requêtes/s : sous la limite de l'API (7/s)
        if (i + 1) % 100 == 0:
            json.dump(rows, open(OUT, "w"), ensure_ascii=False); print(f"  {i+1}/{len(todo)}", flush=True)
    json.dump(rows, open(OUT, "w"), ensure_ascii=False)
    print(f"DONE : NAF connu pour {sum(1 for r in rows if r.get('naf'))}/{len(rows)}", flush=True)

if __name__ == "__main__":
    main()
