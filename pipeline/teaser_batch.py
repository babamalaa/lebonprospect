#!/usr/bin/env python3
"""LeBonProspect — Teaser V2 "vendeur" : batch personnalisé par cible.
Tire les leads directement de la DB (avec téléphones masqués = preuve),
compteurs 90j réels de la zone, branding complet.

Usage:
  python3 teaser_batch.py                      # tout le top30_cibles.csv
  python3 teaser_batch.py --only "Manelli"     # une seule cible
Sortie: ../teasers/batch/<priorite>_<societe>.html
"""
import os, sys, csv, argparse, datetime, html, re

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from load_db import sql_exec

TEAL = "#31777A"; TEAL_SOFT = "#e3efef"; TEAL_LIGHT = "#a9d2d3"
INK = "#14181d"; PAPER = "#fdfbf5"; RED = "#d64a2e"; MUTED = "#6f6a5c"; OK = "#1e7a4d"

MONTHS = ["", "janvier", "février", "mars", "avril", "mai", "juin", "juillet",
          "août", "septembre", "octobre", "novembre", "décembre"]

def date_fr(iso):
    d = datetime.date.fromisoformat(str(iso))
    return f"{d.day} {MONTHS[d.month]}"

def mask_tel(tel):
    """04 93 89 60 38 → 04 93 89 ██ ██ (preuve sans donner)"""
    parts = tel.split(" ")
    if len(parts) >= 5:
        return " ".join(parts[:3] + ["██", "██"])
    return tel[: max(len(tel) - 4, 4)] + " ██ ██"

def get_region_data(region):
    stats = sql_exec(f"""select count(*) filter (where date_parution >= current_date - 90) as n90,
        count(*) filter (where date_parution >= current_date - 30) as n30
        from cessions where verticale = 'chr' and region = '{region.replace(chr(39), chr(39)*2)}';""")[0]
    leads = sql_exec(f"""select * from cessions where verticale = 'chr'
        and region = '{region.replace(chr(39), chr(39)*2)}'
        and acheteur_nom is not null
        order by date_parution desc, telephone nulls last limit 6;""")
    # préférer les leads avec téléphone en tête
    leads.sort(key=lambda r: (r.get("telephone") is None, ))
    return stats, leads[:5]

def lead_html(r, idx):
    nom = html.escape(r.get("place_name") or r.get("acheteur_nom") or r.get("commercant") or "")
    ville = html.escape((r.get("ville") or "").split(",")[0])
    dept = html.escape(r.get("departement") or "")
    dirigeants = r.get("acheteur_dirigeants") or []
    if isinstance(dirigeants, str):
        dirigeants = [d.strip() for d in dirigeants.strip("{}").split(",") if d.strip()]
    dir_txt = ", ".join(re.sub(r"\s*\([^)]*\)", "", d).strip().title() for d in dirigeants[:2])
    tel = r.get("telephone")
    tel_html = (f'<span style="font-family:monospace;font-weight:700;color:{INK};">{mask_tel(tel)}</span>'
                f' <span class="pill-ok">n° vérifié</span>' if tel
                else '<span style="color:#8a8578;">recherche en cours</span>')
    date_txt = date_fr(r["date_parution"]) if r.get("date_parution") else ""
    creation = r.get("acheteur_date_creation")
    fresh = ""
    if creation:
        age = (datetime.date.today() - datetime.date.fromisoformat(str(creation))).days
        fresh = ('<span class="fresh">budgets ouverts</span>' if age <= 180 else '<span class="fresh exp">en expansion</span>')
    return f"""
    <div class="lead">
      <div class="lead-head">
        <span class="lead-num">{idx}</span>
        <div class="lead-title">
          <div class="lead-name">{nom} {fresh}</div>
          <div class="lead-loc">{ville} · {dept} · publié le {date_txt}</div>
        </div>
      </div>
      {f'<div class="lead-row"><b>Repreneur :</b> {html.escape(dir_txt)}</div>' if dir_txt else ''}
      <div class="lead-row"><b>Téléphone établissement :</b> {tel_html}</div>
    </div>"""

def render(cible, region, stats, leads):
    today = datetime.date.today().strftime("%d/%m/%Y")
    items = "\n".join(lead_html(r, i + 1) for i, r in enumerate(leads))
    n90, n30 = stats["n90"], stats["n30"]
    return f"""<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>LeBonProspect × {html.escape(cible)}</title>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@700;800;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ font-family: 'Inter', sans-serif; background: {PAPER}; color: {INK}; line-height: 1.5; padding: 36px 20px; }}
.doc {{ max-width: 640px; margin: 0 auto; }}
.head {{ display: flex; align-items: center; justify-content: space-between; margin-bottom: 26px; }}
.logo {{ font-family: 'Archivo', sans-serif; font-weight: 900; font-size: 19px; display: flex; align-items: center; gap: 9px; }}
.logo .mark {{ background: {TEAL}; border: 2.5px solid {INK}; border-radius: 8px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }}
.head .for {{ font-size: 12px; color: {MUTED}; text-align: right; }}
.head .for b {{ color: {INK}; display: block; font-size: 13px; }}
h1 {{ font-family: 'Archivo', sans-serif; font-size: 26px; font-weight: 900; letter-spacing: -.02em; line-height: 1.18; margin-bottom: 6px; }}
h1 .hl {{ background: linear-gradient(transparent 60%, {TEAL_LIGHT} 60%); }}
.intro {{ font-size: 14px; color: #4a4a42; margin-bottom: 22px; }}
.stats {{ display: flex; gap: 12px; margin-bottom: 24px; }}
.stat {{ flex: 1; border: 2px solid {INK}; border-radius: 12px; padding: 14px 10px; text-align: center; background: #fff; }}
.stat.hot {{ background: {TEAL}; color: #fff; border-color: {INK}; }}
.stat .n {{ font-family: 'Archivo', sans-serif; font-size: 26px; font-weight: 900; }}
.stat .l {{ font-size: 10.5px; margin-top: 2px; opacity: .85; }}
.leads-box {{ border: 2.5px solid {INK}; border-radius: 14px; overflow: hidden; background: #fff; box-shadow: 6px 6px 0 {TEAL}; }}
.leads-head {{ background: {TEAL}; color: #fff; padding: 11px 18px; font-family: 'Archivo', sans-serif; font-weight: 800; font-size: 12.5px; letter-spacing: .03em; }}
.lead {{ padding: 14px 18px; border-bottom: 1.5px dashed #e6e0d0; }}
.lead:last-child {{ border-bottom: none; }}
.lead-head {{ display: flex; gap: 12px; align-items: flex-start; margin-bottom: 6px; }}
.lead-num {{ background: {TEAL_SOFT}; border: 1.5px solid {INK}; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; flex-shrink: 0; }}
.lead-name {{ font-weight: 700; font-size: 15px; }}
.lead-loc {{ font-size: 12px; color: {TEAL}; font-weight: 600; }}
.lead-row {{ font-size: 13px; margin: 3px 0 0 36px; }}
.pill-ok {{ font-size: 10px; font-weight: 700; background: #e7f5ec; color: {OK}; border: 1px solid {OK}; padding: 1px 7px; border-radius: 10px; vertical-align: 1px; }}
.fresh {{ font-size: 10px; font-weight: 800; background: #fdeae4; color: {RED}; border: 1px solid {RED}; padding: 1px 7px; border-radius: 10px; vertical-align: 2px; }}
.fresh.exp {{ background: {TEAL_SOFT}; color: {TEAL}; border-color: {TEAL}; }}
.why {{ margin: 22px 0; padding: 16px 18px; background: {TEAL_SOFT}; border-radius: 12px; border: 1.5px solid {TEAL_LIGHT}; font-size: 13px; }}
.why b {{ color: {TEAL}; }}
.cta {{ text-align: center; margin-top: 24px; }}
.cta .price {{ font-size: 13px; color: {MUTED}; margin-bottom: 10px; }}
.cta .price b {{ color: {INK}; font-size: 15px; }}
.cta a {{ display: inline-block; font-family: 'Archivo', sans-serif; background: {INK}; color: #fff; padding: 14px 28px; border-radius: 10px; font-weight: 800; font-size: 14.5px; text-decoration: none; border: 2.5px solid {INK}; }}
.cta .sub {{ font-size: 11.5px; color: {MUTED}; margin-top: 9px; }}
.foot {{ margin-top: 30px; padding-top: 12px; border-top: 1.5px solid #e6e0d0; font-size: 10.5px; color: {MUTED}; text-align: center; }}
@media print {{ body {{ padding: 10px; }} .leads-box {{ box-shadow: none; }} }}
</style></head>
<body><div class="doc">
  <div class="head">
    <div class="logo"><span class="mark"><svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M2 13 L7 5 L11 10 L16 3" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="3" r="2.2" fill="#d64a2e"/></svg></span>LeBonProspect</div>
    <div class="for">Document préparé pour<b>{html.escape(cible)}</b>{today}</div>
  </div>

  <h1>{n90} restaurants, bars et hôtels <span class="hl">ont changé de propriétaire</span> près de chez vous en 90 jours.</h1>
  <p class="intro">Chacun de ces repreneurs rééquipe, rénove et resigne ses contrats fournisseurs en ce moment. En voici 5, publiés au Journal officiel ces derniers jours — réels et vérifiables.</p>

  <div class="stats">
    <div class="stat hot"><div class="n">{n90}</div><div class="l">reprises CHR<br>en 90 jours · {html.escape(region)}</div></div>
    <div class="stat"><div class="n">{n30}</div><div class="l">sur les 30<br>derniers jours</div></div>
    <div class="stat"><div class="n">8h00</div><div class="l">dans votre boîte mail<br>chaque matin</div></div>
  </div>

  <div class="leads-box">
    <div class="leads-head">DERNIÈRES REPRISES · {html.escape(region.upper())}</div>
    {items}
  </div>

  <div class="why"><b>Pourquoi les numéros sont masqués :</b> ce document est un échantillon. Nos abonnés reçoivent chaque matin les reprises complètes de leur zone, avec le numéro de téléphone de chaque établissement, prêt à appeler.</div>

  <div class="cta">
    <div class="price">Votre région entière : <b>299 €/mois</b> · votre département seul : <b>149 €/mois</b> · sans engagement</div>
    <a href="https://www.lebonprospect.fr">Activer ma zone sur lebonprospect.fr</a>
    <div class="sub">Un seul client signé rembourse deux ans d'abonnement.</div>
  </div>

  <div class="foot">LeBonProspect · données issues d'actes officiels publiés (BODACC, licence ouverte) · échantillon généré le {today}</div>
</div></body></html>"""

def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower())[:40].strip("-")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only")
    ap.add_argument("--csv", default=os.path.join(HERE, "..", "data", "top30_cibles.csv"))
    args = ap.parse_args()
    outdir = os.path.join(HERE, "..", "teasers", "batch")
    os.makedirs(outdir, exist_ok=True)
    REGION_MAP = {"Île-de-France": "Île-de-France", "PACA": "Provence-Alpes-Côte d'Azur",
                  "Auvergne-Rhône-Alpes": "Auvergne-Rhône-Alpes"}
    cache = {}
    n = 0
    for row in csv.DictReader(open(args.csv), delimiter=";"):
        if args.only and args.only.lower() not in row["societe"].lower():
            continue
        region = REGION_MAP.get(row["region"], row["region"])
        if region not in cache:
            cache[region] = get_region_data(region)
        stats, leads = cache[region]
        html_out = render(row["societe"], region, stats, leads)
        path = os.path.join(outdir, f"{int(row['priorite']):02d}_{slug(row['societe'])}.html")
        with open(path, "w") as f:
            f.write(html_out)
        n += 1
        print(f"{row['priorite']:>2s}. {row['societe'][:44]:46s} → {os.path.basename(path)}")
    print(f"\nDONE: {n} teasers → {outdir}")

if __name__ == "__main__":
    main()
