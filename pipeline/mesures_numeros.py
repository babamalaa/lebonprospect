#!/usr/bin/env python3
"""Trois mesures + site web, en LECTURE SEULE (rien n'est écrit en base) — 5 octobre 2026.

  A. Les refus « ni le nom ni l'adresse » : vrais échecs de Google, ou règle trop stricte ? (affichage pour relecture humaine)
     + l'enseigne officielle (annuaire des entreprises, gratuit) change-t-elle le résultat ?
  B. Les fiches « autres » (BTP, nettoyage, services…) jamais cherchées : combien de numéros validés ?
  C. Le site web du commerce : combien de fiches ont un site, un email, un numéro différent de celui de Google ?

Sortie : /tmp/mesures.json + résumé. Compte chaque requête Google envoyée.
"""
import sys, os, re, json, time, random, urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from load_db import sql_exec, env
import enrich_places as ep
import scrape_emails as se

KEY = env("GOOGLE_PLACES_KEY")
NREQ = 0
D = "('Côte-d''Or','Saône-et-Loire','Ardennes','Aisne','Marne')"
COMM = ("(coalesce(naf_fonds, acheteur_naf) ~ '^(47|55|56|10\\.71|10\\.13|96\\.0[12]|45\\.|93\\.13|96\\.09|86\\.9|32\\.5|79\\.90|43\\.)' "
        "or verticale in ('chr','alimentaire','coiffure_beaute','garage_auto','fleuriste','tabac_presse','pressing_services','sante'))")
NOFUS = "(acte_descriptif is null or (acte_descriptif not ilike '%fusion%' and acte_descriptif not ilike '%scission%'))"
COLS = "id, commercant, cp, ville, vendeur_nom, acheteur_nom, acheteur_adresse, acheteur_siren, verticale, telephone, place_name, tel_validation"
SOCIAL = ("facebook.", "instagram.", "tiktok.", "linkedin.", "twitter.", "x.com", "wa.me", "google.", "tripadvisor.", "ubereats.", "deliveroo.",
          "thefork.", "pagesjaunes.", "linktr.ee", "yelp.", "booking.com", "restaurantguru", "mapstr", "pappers", "societe.com")
PHONE_RE = re.compile(r"(?:(?:\+|00)33[\s.]?|0)[1-9](?:[\s.\-]?\d{2}){4}")


def search(q, n=5):
    global NREQ
    NREQ += 1
    req = urllib.request.Request(
        "https://places.googleapis.com/v1/places:searchText",
        data=json.dumps({"textQuery": q, "languageCode": "fr", "regionCode": "FR", "maxResultCount": n}).encode(),
        headers={"Content-Type": "application/json", "X-Goog-Api-Key": KEY,
                 "X-Goog-FieldMask": "places.displayName,places.nationalPhoneNumber,places.formattedAddress,places.types,places.primaryType,places.businessStatus,places.websiteUri"},
        method="POST")
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.loads(r.read().decode()).get("places") or []
    except Exception:
        return []


def trouver(row):
    """Même logique que enrich_places.trouver_lieu, mais renvoie aussi tous les candidats vus (pour relecture)."""
    adr = (row.get("acheteur_adresse") or "").strip()
    lieu = adr or (row.get("ville") or "").split(",")[0].strip()
    requetes = [f"{n} {lieu}" for n in ep.noms_repreneur(row)[:2]]
    if row.get("verticale") == "chr" and adr:
        requetes.append(f"restaurant bar café {adr}")
    vus, dernier = [], "aucune requête"
    for q in requetes[:3]:
        for p in search(q, 5):
            vus.append(p)
            ok, why = ep.valider_lieu(p, row)
            if ok:
                return p, why, vus
            dernier = why
        time.sleep(0.05)
    return None, dernier, vus


def sirene_enseignes(siren):
    """Enseignes / noms commerciaux officiels d'un SIREN (annuaire des entreprises, API publique gratuite)."""
    try:
        req = urllib.request.Request(f"https://recherche-entreprises.api.gouv.fr/search?q={siren}&per_page=1", headers={"User-Agent": "lebonprospect/1.0"})
        with urllib.request.urlopen(req, timeout=15) as r:
            res = (json.loads(r.read().decode()).get("results") or [None])[0]
    except Exception:
        return []
    if not res:
        return []
    noms = []
    for e in [res.get("siege") or {}] + (res.get("matching_etablissements") or []):
        noms += list(e.get("liste_enseignes") or []) + ([e.get("nom_commercial")] if e.get("nom_commercial") else [])
    out, vus = [], set()
    for n in noms:
        if n and n.lower() not in vus:
            vus.add(n.lower()); out.append(n)
    time.sleep(0.2)
    return out


def norm_phone(p):
    d = re.sub(r"\D", "", p)
    if d.startswith("0033"): d = "0" + d[4:]
    elif d.startswith("33") and len(d) == 11: d = "0" + d[2:]
    return d


def scrape_site(url):
    base = url.split("?")[0]
    emails, phones, ok = set(), set(), False
    for suffix in ("", "/contact", "/mentions-legales"):
        try:
            t, _ = se.fetch(base.rstrip("/") + suffix)
        except Exception:
            continue
        if not t:
            continue
        ok = True
        emails |= se.extract(t)
        phones |= {norm_phone(m.group(0)) for m in PHONE_RE.finditer(t)}
    return {"ok": ok, "emails": sorted(emails), "phones": sorted(phones)}


def main():
    random.seed(11)
    out = {"A": [], "B": [], "C": []}

    # ---------- A. refus « ni le nom ni l'adresse » ----------
    A = sql_exec(f"select {COLS} from cessions where departement in {D} and date_parution >= current_date-90 and tel_validation = 'rejete : ni le nom ni l''adresse' order by random() limit 34;")
    print(f"\n=== A. {len(A)} refus « ni le nom ni l'adresse » ===", flush=True)
    for r in A:
        p, why, vus = trouver(r)                       # rejoue : doit refuser (même règle)
        ens = sirene_enseignes(r["acheteur_siren"]) if r.get("acheteur_siren") else []
        recup = None
        if ens and not p:                              # on rejoue avec l'enseigne officielle comme nom
            r2 = dict(r, commercant=f"{ens[0]}, {r.get('commercant') or ''}")
            p2, why2, vus2 = trouver(r2)
            if p2: recup = {"nom": p2["displayName"]["text"], "tel": p2.get("nationalPhoneNumber"), "adr": p2.get("formattedAddress"), "raison": why2}
            vus += vus2
        cp = (re.findall(r"(\d{5})", r.get("acheteur_adresse") or "") or [""])[-1]
        meme_cp = [x for x in vus if cp and cp in (x.get("formattedAddress") or "") and x.get("nationalPhoneNumber")]
        meilleur = None
        for x in meme_cp:
            nm = (x.get("displayName") or {}).get("text", "")
            if ep.noms_similaires(nm, r.get("acheteur_nom") or "") or ep.meme_adresse(r.get("acheteur_adresse"), x.get("formattedAddress") or ""):
                meilleur = x; break
        meilleur = meilleur or (meme_cp[0] if meme_cp else None)
        out["A"].append({"id": r["id"], "repreneur": r["acheteur_nom"], "commercant": (r["commercant"] or "")[:60], "metier": r["verticale"],
                         "adr": r["acheteur_adresse"], "ancien": [r["place_name"], r["telephone"]], "enseignes_sirene": ens[:3], "recupere_par_enseigne": recup,
                         "meilleur_candidat": ({"nom": meilleur["displayName"]["text"], "tel": meilleur.get("nationalPhoneNumber"), "adr": meilleur.get("formattedAddress"),
                                                "types": (meilleur.get("types") or [])[:2]} if meilleur else None)})
        c = out["A"][-1]
        mc = c["meilleur_candidat"]
        print(f"- {str(c['repreneur'])[:30]:30s} [{c['metier'][:6]}] {str(c['adr'])[:46]:46s} | enseigne SIRENE: {ens[:2] or '-'} | "
              + (f"RÉCUP ENSEIGNE: {recup['nom']} {recup['tel']}" if recup else (f"Google: {mc['nom'][:28]} {mc['tel']} · {mc['adr'][:34]} · {mc['types']}" if mc else "Google: aucun lieu avec numéro dans la commune")), flush=True)

    # ---------- B. fiches « autres » jamais cherchées ----------
    B = sql_exec(f"select {COLS} from cessions where departement in {D} and date_parution >= current_date-90 and verticale = 'autres' and tel_validation is null and {COMM} and {NOFUS} order by random() limit 42;")
    print(f"\n=== B. {len(B)} fiches « autres » jamais cherchées ===", flush=True)
    valides_B = []
    for r in B:
        p, why, vus = trouver(r)
        out["B"].append({"id": r["id"], "repreneur": r["acheteur_nom"], "valide": bool(p), "raison": why,
                         "lieu": (p["displayName"]["text"] if p else None), "tel": (p.get("nationalPhoneNumber") if p else None), "site": (p.get("websiteUri") if p else None)})
        if p: valides_B.append((r, p))
    nb = sum(1 for x in out["B"] if x["valide"])
    print(f"numéros validés : {nb}/{len(B)} ({round(100*nb/max(1,len(B)))} %)", flush=True)
    for x in out["B"][:14]:
        print("  ", "OK " if x["valide"] else "non", str(x["repreneur"])[:30], "->", x["lieu"] or x["raison"], x["tel"] or "", flush=True)

    # ---------- C. site web : échantillon de numéros déjà validés + ceux de B ----------
    C = sql_exec(f"select {COLS} from cessions where departement in {D} and date_parution >= current_date-90 and tel_validation is not null and tel_validation not like 'rejete%' and {COMM} and verticale <> 'autres' order by random() limit 40;")
    cibles = []
    for r in C:
        p, why, vus = trouver(r)
        if p: cibles.append((r, p))
    cibles += valides_B
    print(f"\n=== C. site web sur {len(cibles)} établissements validés ===", flush=True)
    sites = []
    for r, p in cibles:
        u = p.get("websiteUri") or ""
        out["C"].append({"id": r["id"], "repreneur": r["acheteur_nom"], "metier": r["verticale"], "tel_google": p.get("nationalPhoneNumber"), "site": u,
                         "reseau_social": bool(u) and any(s in u.lower() for s in SOCIAL)})
    avec = [x for x in out["C"] if x["site"] and not x["reseau_social"]]
    def work(x):
        s = scrape_site(x["site"]); x["scrape"] = s; return x
    with ThreadPoolExecutor(8) as ex:
        list(ex.map(work, avec))
    n = len(out["C"]); n_site = len(avec); n_social = sum(1 for x in out["C"] if x["reseau_social"])
    n_ok = sum(1 for x in avec if x["scrape"]["ok"])
    n_mail = sum(1 for x in avec if x["scrape"]["emails"])
    def dom(u):
        return se.site_domain_of(u)
    n_mail_dom = sum(1 for x in avec if any(dom(x["site"]) and (e.partition("@")[2] == dom(x["site"]) or e.partition("@")[2].endswith("." + dom(x["site"]))) for e in x["scrape"]["emails"]))
    n_diff = sum(1 for x in avec if x["scrape"]["phones"] and norm_phone(x["tel_google"] or "") not in x["scrape"]["phones"])
    print(f"établissements validés : {n} | site web propre : {n_site} ({round(100*n_site/max(1,n))} %) | page réseau social seule : {n_social} | pas de site : {n-n_site-n_social}", flush=True)
    print(f"parmi les sites propres : lisibles {n_ok} | au moins un email {n_mail} | email sur le domaine du site {n_mail_dom} | numéro du site différent de Google {n_diff}", flush=True)
    for x in [y for y in avec if y["scrape"]["phones"] and norm_phone(y["tel_google"] or "") not in y["scrape"]["phones"]][:6]:
        print(f"   écart : {str(x['repreneur'])[:28]} Google {x['tel_google']} | site {x['scrape']['phones'][:3]}", flush=True)
    print(f"\nREQUÊTES GOOGLE ENVOYÉES : {NREQ}", flush=True)
    json.dump({"requetes_google": NREQ, **out}, open("/tmp/mesures.json", "w"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
