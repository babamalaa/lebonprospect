#!/usr/bin/env python3
"""LeBonProspect — Teaser generator (l'arme de closing).
Génère un document HTML (imprimable PDF) avec les N dernières reprises réelles
d'une verticale × zone, aux couleurs de la marque. À envoyer à un prospect
pour prouver la valeur avec SES données locales.

Usage:
  python3 teaser.py chr "Provence-Alpes-Côte d'Azur"
  python3 teaser.py coiffure_beaute "Occitanie" --n 5
  python3 teaser.py chr "Rhône" --dept          # par département
  python3 teaser.py chr "Bretagne" --prospect "Agencement Morbihan"

Lit les JSONL locaux (récents → anciens), enrichit à la volée si besoin,
s'arrête dès que N leads de la verticale sont trouvés.
Sortie: ../teasers/teaser_<verticale>_<zone>_<date>.html
"""
import json, os, sys, glob, argparse, datetime, html
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ingest import classify, enrich_siren

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data", "cessions")
OUT = os.path.join(HERE, "..", "teasers")

VERT_LABELS = {
    "chr": "restaurants, bars & hôtels",
    "alimentaire": "commerces alimentaires",
    "coiffure_beaute": "salons de coiffure & instituts",
    "garage_auto": "garages & services auto",
    "pressing_services": "pressings & services",
    "sante": "pharmacies & santé",
    "fleuriste": "fleuristes",
    "tabac_presse": "tabacs & presse",
}

def collect(verticale, zone, by_dept=False, n=5, max_days=60):
    files = sorted(glob.glob(os.path.join(DATA, "*.jsonl")), reverse=True)[:max_days]
    cache, found, scanned = {}, [], 0
    zone_lower = zone.lower()
    for fp in files:
        for line in open(fp):
            r = json.loads(line)
            field = (r.get("departement") if by_dept else r.get("region")) or ""
            if field.lower() != zone_lower:
                continue
            scanned += 1
            # enrichir si pas déjà fait (backfill brut)
            if "verticale" not in r or r.get("verticale") in (None, "inconnu"):
                v_info = enrich_siren(r.get("vendeur_siren"), cache)
                a_info = enrich_siren(r.get("acheteur_siren"), cache)
                r["vendeur_info"], r["acheteur_info"] = v_info, a_info
                naf = (v_info or {}).get("naf")
                if not naf or naf == "00.00Z":
                    naf = (a_info or {}).get("naf")
                r["naf_fonds"] = naf
                r["verticale"] = classify(naf or "")
            if r.get("verticale") == verticale:
                found.append(r)
                if len(found) >= n:
                    return found, scanned
    return found, scanned

def lead_html(r):
    ai = r.get("acheteur_info") or {}
    nom = ai.get("nom_complet") or (r.get("personnes") or [{}])[0].get("denomination") or r.get("commercant") or "—"
    dirigeants = ", ".join(ai.get("dirigeants") or []) or None
    adresse = ai.get("siege_adresse") or (r.get("personnes") or [{}])[0].get("adresse") or ""
    date_fr = "—"
    if r.get("date_parution"):
        d = datetime.date.fromisoformat(r["date_parution"])
        date_fr = d.strftime("%d/%m/%Y")
    creation = ""
    if ai.get("date_creation"):
        dc = datetime.date.fromisoformat(ai["date_creation"])
        age_days = (datetime.date.today() - dc).days
        if age_days <= 180:
            creation = f"Société créée le {dc.strftime('%d/%m/%Y')} — reprise toute fraîche, budgets ouverts"
        else:
            creation = f"Acquéreur établi depuis {dc.year} — en expansion"
    tel = r.get("telephone")
    tel_row = f'<div class="lead-row"><b>☎ Établissement :</b> {html.escape(tel)}</div>' if tel else '<div class="lead-row muted2">☎ Numéro de l\'établissement : inclus dans l\'abonnement</div>'
    return f"""
    <div class="lead">
      <div class="lead-top">
        <span class="lead-name">{html.escape(str(nom))}</span>
        <span class="lead-date">publié le {date_fr}</span>
      </div>
      <div class="lead-loc">📍 {html.escape(str(r.get('ville') or ''))} · {html.escape(str(r.get('departement') or ''))}</div>
      {f'<div class="lead-row"><b>Dirigeant(s) :</b> {html.escape(dirigeants)}</div>' if dirigeants else ''}
      {f'<div class="lead-row"><b>Adresse :</b> {html.escape(adresse)}</div>' if adresse else ''}
      {tel_row}
      {f'<div class="lead-row muted">{creation}</div>' if creation else ''}
    </div>"""

def render(verticale, zone, leads, prospect=None, period_days=None):
    label = VERT_LABELS.get(verticale, verticale)
    today = datetime.date.today().strftime("%d/%m/%Y")
    greeting = f"Préparé pour <b>{html.escape(prospect)}</b> · " if prospect else ""
    items = "\n".join(lead_html(r) for r in leads)
    return f"""<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>LeBonProspect — {html.escape(label)} · {html.escape(zone)}</title>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@700;800;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
:root {{ --teal: #31777A; --teal-soft: #e3efef; --teal-light: #a9d2d3; --ink: #14181d; --paper: #fdfbf5; --red: #d64a2e; --muted: #6f6a5c; }}
body {{ font-family: 'Inter', sans-serif; background: var(--paper); color: var(--ink); line-height: 1.5; padding: 40px 20px; }}
.doc {{ max-width: 680px; margin: 0 auto; }}
.head {{ display: flex; align-items: center; justify-content: space-between; margin-bottom: 30px; }}
.logo {{ font-family: 'Archivo', sans-serif; font-weight: 900; font-size: 19px; display: flex; align-items: center; gap: 8px; }}
.logo .mark {{ background: var(--teal); border: 2.5px solid var(--ink); border-radius: 7px; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; }}
.head .date {{ font-size: 12.5px; color: var(--muted); }}
h1 {{ font-family: 'Archivo', sans-serif; font-size: 27px; font-weight: 900; letter-spacing: -.02em; line-height: 1.15; margin-bottom: 8px; }}
h1 .hl {{ background: linear-gradient(transparent 60%, var(--teal-light) 60%); }}
.intro {{ font-size: 14.5px; color: #4a4a42; margin-bottom: 26px; }}
.leads {{ border: 2.5px solid var(--ink); border-radius: 14px; overflow: hidden; background: #fff; box-shadow: 7px 7px 0 var(--teal); }}
.leads-head {{ background: var(--teal); color: #fff; padding: 12px 20px; font-family: 'Archivo', sans-serif; font-weight: 800; font-size: 13.5px; letter-spacing: .02em; }}
.lead {{ padding: 16px 20px; border-bottom: 1.5px dashed #e6e0d0; }}
.lead:last-child {{ border-bottom: none; }}
.lead-top {{ display: flex; justify-content: space-between; align-items: baseline; }}
.lead-name {{ font-weight: 700; font-size: 15.5px; }}
.lead-date {{ font-size: 11.5px; color: var(--muted); }}
.lead-loc {{ font-size: 13px; color: var(--teal); font-weight: 600; margin: 2px 0 6px; }}
.lead-row {{ font-size: 13px; margin-top: 3px; }}
.lead-row.muted {{ color: var(--red); font-weight: 600; font-size: 12.5px; }}
.lead-row.muted2 {{ color: var(--teal); font-weight: 600; font-size: 12.5px; }}
.why {{ margin: 26px 0; padding: 18px 20px; background: var(--teal-soft); border-radius: 12px; border: 1.5px solid var(--teal-light); font-size: 13.5px; }}
.why b {{ color: var(--teal); }}
.cta {{ text-align: center; margin-top: 26px; }}
.cta a {{ display: inline-block; font-family: 'Archivo', sans-serif; background: var(--ink); color: #fff; padding: 13px 26px; border-radius: 10px; font-weight: 800; font-size: 14px; text-decoration: none; border: 2.5px solid var(--ink); }}
.cta .sub {{ font-size: 12px; color: var(--muted); margin-top: 10px; }}
.foot {{ margin-top: 34px; padding-top: 14px; border-top: 1.5px solid #e6e0d0; font-size: 11px; color: var(--muted); text-align: center; }}
@media print {{ body {{ padding: 0; }} .leads {{ box-shadow: none; }} }}
</style></head>
<body><div class="doc">
  <div class="head">
    <div class="logo"><span class="mark"><svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M2 13 L7 5 L11 10 L16 3" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="3" r="2.2" fill="#d64a2e"/></svg></span>LeBonProspect</div>
    <div class="date">{greeting}édition du {today}</div>
  </div>
  <h1>Les {len(leads)} derniers {html.escape(label)} <span class="hl">repris près de chez vous.</span></h1>
  <p class="intro">Chaque reprise ci-dessous est un acte officiel, publié au Journal officiel et vérifiable. Chacun de ces repreneurs rééquipe, rénove et resigne ses contrats <b>en ce moment même</b>.</p>
  <div class="leads">
    <div class="leads-head">REPRISES RÉCENTES — {html.escape(zone.upper())}</div>
    {items}
  </div>
  <div class="why"><b>Pourquoi vous recevez ce document :</b> ces informations sont publiques, mais introuvables sans les trier parmi des centaines de pages de jargon juridique chaque semaine. Nous le faisons chaque matin, pour votre métier, dans votre zone. Ceci est un échantillon réel de ce que nos abonnés reçoivent à 8h.</div>
  <div class="cta">
    <a href="https://lebonprospect.fr">Recevoir les reprises de ma zone chaque matin</a>
    <div class="sub">Dès 149 €/mois · sans engagement · lebonprospect.fr</div>
  </div>
  <div class="foot">LeBonProspect — données issues du BODACC (licence ouverte). Document généré le {today}. Les informations proviennent d'actes officiels publiés ; elles sont fournies à titre d'échantillon.</div>
</div></body></html>"""

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("verticale", choices=list(VERT_LABELS.keys()))
    ap.add_argument("zone", help="Nom exact de la région (ou du département avec --dept)")
    ap.add_argument("--dept", action="store_true", help="zone = département")
    ap.add_argument("--n", type=int, default=5)
    ap.add_argument("--prospect", help="Nom du prospect destinataire (personnalisation)")
    args = ap.parse_args()
    leads, scanned = collect(args.verticale, args.zone, by_dept=args.dept, n=args.n)
    if not leads:
        sys.exit(f"Aucun lead {args.verticale} trouvé pour '{args.zone}' (scanné {scanned} annonces). Vérifie l'orthographe exacte de la zone.")
    os.makedirs(OUT, exist_ok=True)
    slug = args.zone.lower().replace(" ", "-").replace("'", "")[:30]
    path = os.path.join(OUT, f"teaser_{args.verticale}_{slug}_{datetime.date.today().isoformat()}.html")
    with open(path, "w") as f:
        f.write(render(args.verticale, args.zone, leads, prospect=args.prospect))
    print(f"OK: {len(leads)} leads ({scanned} annonces scannées) → {path}")
