#!/usr/bin/env python3
"""LeBonProspect — collecte des emails de contact des prospects du pool.

Source : le site web déjà connu de chaque prospect (page d'accueil, puis /contact,
/mentions-legales, /nous-contacter, etc.). Aucune source tierce, aucune devinette.

Écrit dans prospects_pool.email (+ email_source, email_checked_at).
Priorité : contact@ > commercial@ > info@/bonjour@ > direction@/prenom.nom@ > autres.
Exclus : noreply, no-reply, webmaster, postmaster, abuse, privacy, dpo, rgpd, example, sentry, wixpress...

Usage : python3 scrape_emails.py [--limit N] [--workers 12] [--dry-run]
"""
import re, sys, json, time, argparse, urllib.request, urllib.parse, ssl, html, os
from concurrent.futures import ThreadPoolExecutor, as_completed
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from load_db import sql_exec

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"
CTX = ssl.create_default_context(); CTX.check_hostname = False; CTX.verify_mode = ssl.CERT_NONE
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PLACEHOLDERS = ("nomdunecom", "nomdusite", "monsite", "votresite", "jean.dupont", "john.doe", "votre@", "email@email", "nom@", "prenom.nom@", "exemple@", "adresse@", "mail@mail", "monadresse", "xxx@", "user@", "name@", "yourname", "your@", "info@example")
AGENCIES = ("webador", "nanowebdesign", "biznet-solution", "divihomestaging", "wix", "jimdo", "site123", "ionos", "ovh.", "o2switch", "e-monsite", "strikingly", "weebly", "godaddy", "hostinger", "orson", "simplebo", "linkeo", "solocal", "pagesjaunes", "ytcvn", "webself", "agence-", "agence.", "-agence", "webdesign", "creation-site", "creationsite")
BAD_LOCAL = ("noreply", "no-reply", "nepasrepondre", "webmaster", "postmaster", "abuse", "privacy", "dpo", "rgpd", "cnil", "example", "test", "sentry", "mailer-daemon", "hostmaster", "support@wix", "domain")
BAD_DOMAIN = ("example.", "sentry.", "wixpress", "wix.com", "squarespace", "shopify", "google.", "gmail.com.", "facebook", "instagram", "linkedin", "youtube", "png", "jpg", "svg", "webp", "gif", "css", "js")
SUBPAGES = ["/contact", "/contactez-nous", "/nous-contacter", "/contact-us", "/mentions-legales", "/mentions-légales", "/a-propos", "/qui-sommes-nous", "/infos-pratiques"]

def fetch(url, timeout=8):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "fr-FR,fr;q=0.9"})
    with urllib.request.urlopen(req, timeout=timeout, context=CTX) as r:
        if "text/html" not in (r.headers.get("Content-Type") or "") and "text/plain" not in (r.headers.get("Content-Type") or ""):
            return "", r.geturl()
        raw = r.read(600_000)
        return raw.decode(r.headers.get_content_charset() or "utf-8", errors="ignore"), r.geturl()

def extract(text):
    text = html.unescape(text)
    # obfuscations courantes
    text = re.sub(r"\s*\[at\]\s*|\s*\(at\)\s*|\s+at\s+(?=[a-z0-9-]+\s*(\.|\[dot\]|\(dot\))\s*[a-z]{2,})", "@", text, flags=re.I)
    text = re.sub(r"\s*\[dot\]\s*|\s*\(dot\)\s*", ".", text, flags=re.I)
    found = set()
    for m in EMAIL_RE.findall(text):
        e = m.strip(".").lower()
        loc, _, dom = e.partition("@")
        if any(b in loc for b in BAD_LOCAL): continue
        if any(b in dom for b in BAD_DOMAIN): continue
        if dom.endswith((".png", ".jpg", ".svg", ".webp", ".gif", ".css", ".js")): continue
        if len(e) > 60: continue
        if any(ph in e for ph in PLACEHOLDERS): continue
        if any(ag in dom for ag in AGENCIES): continue
        found.add(e)
    # mailto: (souvent plus propre)
    for m in re.findall(r'mailto:([^"\'?\s>]+)', text, flags=re.I):
        e = urllib.parse.unquote(m).strip().lower()
        if EMAIL_RE.fullmatch(e) and not any(b in e for b in BAD_LOCAL) and not any(ph in e for ph in PLACEHOLDERS) and not any(ag in e.partition("@")[2] for ag in AGENCIES): found.add(e)
    return found

def score(e, site_domain):
    loc, _, dom = e.partition("@")
    s = 0
    if site_domain and (dom == site_domain or dom.endswith("." + site_domain) or site_domain.endswith("." + dom)): s += 50
    elif dom in ("gmail.com", "orange.fr", "wanadoo.fr", "free.fr", "hotmail.fr", "hotmail.com", "outlook.fr", "outlook.com", "yahoo.fr", "sfr.fr", "laposte.net", "bbox.fr", "icloud.com"): s += 20
    else: s -= 15   # domaine tiers (agence, prestataire) : dernier recours
    if loc.startswith("contact"): s += 30
    elif loc.startswith(("commercial", "vente", "sales", "devis")): s += 26
    elif loc in ("info", "infos", "bonjour", "hello", "accueil"): s += 22
    elif loc.startswith(("direction", "gerant", "gérant", "dg", "pdg")): s += 20
    elif "." in loc or "-" in loc: s += 15   # prenom.nom
    elif loc in ("admin", "administration", "compta", "comptabilite", "facturation", "rh", "recrutement", "sav", "technique"): s -= 10
    else: s += 8
    return s

def site_domain_of(url):
    try:
        h = urllib.parse.urlparse(url if "://" in url else "https://" + url).netloc.lower()
        return h[4:] if h.startswith("www.") else h
    except Exception:
        return ""

def process(p):
    url = p["site_web"].strip()
    if not url.startswith("http"): url = "https://" + url
    sd = site_domain_of(url)
    emails, pages_ok = set(), 0
    try:
        t, final = fetch(url); pages_ok += 1
        emails |= extract(t)
        base = final.rstrip("/")
        # liens "contact" trouvés dans la page (plus fiable que les chemins devinés)
        links = set(re.findall(r'href="([^"]*(?:contact|mention|propos|legal)[^"]*)"', t, flags=re.I))
        cands = [urllib.parse.urljoin(final, l) for l in list(links)[:3]] + [base + s for s in SUBPAGES]
        seen = set()
        for u in cands:
            if u in seen or len(emails) >= 3: continue
            seen.add(u)
            try:
                t2, _ = fetch(u, timeout=6); pages_ok += 1
                emails |= extract(t2)
            except Exception:
                pass
    except Exception as e:
        return {"id": p["id"], "email": None, "source": f"erreur:{type(e).__name__}", "n": 0}
    if not emails:
        return {"id": p["id"], "email": None, "source": "aucun", "n": pages_ok}
    best = max(emails, key=lambda e: score(e, sd))
    return {"id": p["id"], "email": best, "source": "site", "n": pages_ok, "all": sorted(emails)[:5]}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--workers", type=int, default=12)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    sql_exec("alter table prospects_pool add column if not exists email text, add column if not exists email_source text, add column if not exists email_checked_at timestamptz;")
    rows = sql_exec("select id, societe, site_web from prospects_pool where not exclu_pool and site_web is not null and email_checked_at is null order by (case when type_num='mobile' then 2 else 0 end + case when nb_avis between 6 and 60 then 2 else 0 end) desc, id" + (f" limit {a.limit}" if a.limit else "") + ";")
    print(f"{len(rows)} sites à parcourir", flush=True)
    esc = lambda x: (x or "").replace("'", "''")
    def flush(batch):
        if a.dry_run or not batch: return
        vals = ",".join(f"({r['id']},{('NULL' if not r['email'] else chr(39)+esc(r['email'])+chr(39))},'{esc(r['source'])}')" for r in batch)
        for attempt in range(3):
            try:
                sql_exec(f"update prospects_pool p set email=v.email, email_source=v.src, email_checked_at=now() from (values {vals}) as v(id,email,src) where p.id=v.id;")
                return
            except Exception as e:
                print("   (écriture échouée, nouvel essai)", type(e).__name__, flush=True); time.sleep(5)
    results, done, batch = [], 0, []
    with ThreadPoolExecutor(max_workers=a.workers) as ex:
        futs = {ex.submit(process, r): r for r in rows}
        for f in as_completed(futs):
            r = f.result(); results.append(r); batch.append(r); done += 1
            if len(batch) >= 40:
                flush(batch); batch = []
            if done % 50 == 0: print(f"  {done}/{len(rows)} · trouvés: {sum(1 for x in results if x['email'])}", flush=True)
    flush(batch)
    found = [r for r in results if r["email"]]
    print(f"terminé : {len(found)} emails sur {len(results)} sites ({round(100*len(found)/max(1,len(results)))} %)")
    if a.dry_run:
        for r in found[:25]: print("  ", r["email"], "|", r.get("all"))
        return
    print("base mise à jour")

if __name__ == "__main__":
    main()
