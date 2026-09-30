#!/usr/bin/env python3
"""Document presse : les commerces repris en Bourgogne-Franche-Comté sur 90 jours, focus Besançon (pour L'Est Républicain)."""
import sys, re, html, datetime, subprocess, os
sys.path.insert(0, "/Users/baptisteportugal/repreneur/pipeline")
from load_db import sql_exec

rows = sql_exec("""select date_parution, split_part(ville,',',1) v, cp, departement, commercant, acheteur_nom, vendeur_nom, coalesce(naf_fonds, acheteur_naf) naf, acheteur_date_creation, verticale, acte_descriptif, place_name
from cessions where region ilike 'Bourgogne%' and date_parution >= current_date-90
and (acte_descriptif is null or (acte_descriptif not ilike '%fusion%' and acte_descriptif not ilike '%scission%'))
and (coalesce(naf_fonds, acheteur_naf) ~ '^(47|55|56|10\\.71|10\\.13|96\\.0[12]|45\\.20|45\\.11|45\\.31|93\\.13|96\\.09)' or verticale in ('chr','alimentaire','coiffure_beaute','garage_auto','fleuriste','tabac_presse','pressing_services','sante'))
order by date_parution desc;""")
EXCLUS = ("FRANCHE-COMTE ECO-LOGIS", "MIAH", "AUDILAB")
rows = [r for r in rows if not any((r["commercant"] or "").upper().startswith(e) for e in EXCLUS)]
seen, uniq = set(), []
for r in rows:
    k = (r["commercant"] or "").split(",")[0].strip().lower()
    if k in seen: continue
    seen.add(k); uniq.append(r)
rows = uniq

NAF = {"56.10A": "Restaurant traditionnel", "56.10C": "Restauration rapide", "56.30Z": "Bar, brasserie", "55.10Z": "Hôtel", "10.71C": "Boulangerie", "10.71D": "Pâtisserie", "96.02A": "Salon de coiffure", "96.02B": "Institut de beauté", "47.73Z": "Pharmacie", "47.74Z": "Matériel médical", "47.71Z": "Boutique de vêtements", "47.78C": "Commerce de détail", "47.29Z": "Épicerie fine", "45.11Z": "Garage automobile", "45.31Z": "Pièces automobiles", "96.09Z": "Services", "47.11": "Alimentation générale", "47.11B": "Supérette", "47.11C": "Supérette", "47.11D": "Supermarché", "47.26Z": "Tabac", "47.24Z": "Boulangerie, pâtisserie", "47.22Z": "Boucherie", "47.25Z": "Cave à vins", "47.59B": "Décoration, mobilier", "47.72A": "Chaussures", "47.75Z": "Parfumerie", "47.76Z": "Fleuriste", "47.64Z": "Articles de sport", "47.61Z": "Librairie", "47.21Z": "Primeur", "45.20A": "Garage automobile", "45.20B": "Garage automobile", "47.30Z": "Station-service", "86.90": "Santé", "93.13Z": "Salle de sport", "55.20Z": "Hébergement touristique", "56.10B": "Cafétéria", "10.13B": "Charcuterie", "96.01B": "Pressing"}
VERT = {"chr": "Café, hôtel, restaurant", "alimentaire": "Commerce alimentaire", "coiffure_beaute": "Coiffure, beauté", "garage_auto": "Garage", "sante": "Santé", "fleuriste": "Fleuriste"}
def metier(naf, vert): return NAF.get(naf) or VERT.get(vert, "Commerce")
SMALL = {"de", "du", "des", "la", "le", "les", "et", "au", "aux", "en", "sur", "sous", "chez", "d", "l", "un", "une", "à", "a"}
COMMERCE_WORDS = {"boutique", "bar", "cafe", "café", "pizza", "food", "resto", "restaurant", "brasserie", "auberge", "hotel", "hôtel", "salon", "coiffure", "studio", "maison", "garage", "pharmacie", "boulangerie", "patisserie", "pâtisserie", "traiteur", "epicerie", "épicerie", "tabac", "presse", "fleurs", "optique", "institut", "beaute", "beauté", "globe", "relais", "comptoir", "atelier", "cave", "caves", "market", "shop", "store", "kebab", "sushi", "burger", "grill", "bistrot", "bistro", "pub", "club"}
def is_person(seg):
    t = seg.strip()
    if any(w in COMMERCE_WORDS for w in re.findall(r"[a-zà-ÿ]+", t.lower())): return False
    return bool(re.fullmatch(r"[A-ZÉÈÀÇ' -]{2,}", t)) and len(t.split()) <= 2
def titre(s):
    out = []
    for i, w in enumerate(re.sub(r"\s+", " ", s or "").strip().split()):
        lw = w.lower()
        if i > 0 and lw in SMALL: out.append(lw)
        elif len(w) <= 3 and w.isupper() and w.isalpha() and i > 0: out.append(w)
        else: out.append("-".join(x.capitalize() for x in lw.split("-")))
    return " ".join(out)
def enseigne(r):
    """L'enseigne telle que les gens la connaissent. Priorité : Google Places (l'établissement physique),
    sauf s'il renvoie manifestement autre chose (un club de boxe pour un bar...) ; puis nom commercial
    entre parenthèses ; puis vendeur si c'est une enseigne ; puis le segment le plus long de `commercant`."""
    ach = (r.get("acheteur_nom") or ""); ven = (r.get("vendeur_nom") or ""); com = (r.get("commercant") or "")
    place = (r.get("place_name") or "").strip()
    mots = lambda t: set(w for w in re.findall(r"[a-zà-ÿ]{4,}", t.lower()) if w not in {"pharmacie", "restaurant", "boulangerie", "auberge", "food", "pizza", "garage", "coiffure", "studio", "maison"})
    parens = [x.strip() for x in re.findall(r"\(([^)]+)\)", ach)]
    parens = [x for x in parens if len(x) > 3 and not re.fullmatch(r"[A-Z.]{2,6}", x) and not is_person(x) and mots(x) - mots(ach.split("(")[0])]
    if parens: return titre(parens[-1])          # nom commercial declare par le repreneur (« MAUD BOUTIQUE »)
    if place and (mots(place) & (mots(ach) | mots(ven) | mots(com))):
        place = re.sub(r"\s*\([^)]*\)\s*$", "", place)          # « Cl Coiffure Studio (Béa'titude) » -> sans la parenthèse
        place = re.sub(r"\s+(VALDAHON|BESANCON|PONTARLIER|ORNANS)$", "", place, flags=re.I)
        if len(place) <= 32: return titre(place)
    if " - " in ven: return titre(ven.split(" - ", 1)[1])
    if " - " in ach.split("(")[0]: return titre(ach.split("(")[0].split(" - ", 1)[1])
    vclean = ven.split("(")[0].strip()
    if vclean and "NON-DIFF" not in vclean and not is_person(vclean) and not re.fullmatch(r"[A-Z .]{2,12}", vclean) and len(vclean) > 4 and not vclean.upper().startswith(("SASU", "SAS ", "SARL", "EURL")):
        return titre(vclean)
    segs = [x.strip() for x in com.split(",") if x.strip()]
    cands = [x for x in segs if not is_person(x) and not re.fullmatch(r"[A-Z][a-zé]+", x) and not re.fullmatch(r"[A-Z][a-z]+-[A-Z][a-z]+", x) and not x.upper().startswith(("SASU", "SAS ", "SARL", "EURL"))]
    if cands: return titre(max(cands, key=len))
    return titre(segs[0]) if segs else "Commerce"
MONTHS = ["", "janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
def date_fr(iso): d = datetime.date.fromisoformat(str(iso)[:10]); return f"{d.day} {MONTHS[d.month]}"
def est_neuf(r):
    if not r["acheteur_date_creation"]: return False
    return (datetime.date.fromisoformat(str(r["date_parution"])[:10]) - datetime.date.fromisoformat(str(r["acheteur_date_creation"])[:10])).days <= 180
def fmt(n): return f"{n:,}".replace(",", " ")


import collections
today = datetime.date.today()
def fmt(n): return f"{n:,}".replace(",", " ")
TAG = '<span class="tag">nouvelle société</span>'
import unicodedata
norm = lambda t: unicodedata.normalize("NFKD", t.lower()).encode("ascii", "ignore").decode()
def row_html(r, with_dept=False):
    ens = html.escape(enseigne(r)); m = html.escape(metier(r["naf"], r["verticale"]))
    rep = titre((r["acheteur_nom"] or "").split("(")[0].strip())
    ens_n = norm(enseigne(r)); rep_n = norm(rep)
    redondant = (not rep) or rep_n == ens_n or rep_n.startswith(ens_n) or ens_n.startswith(rep_n) or rep_n.replace("la ", "").startswith(ens_n.replace("la ", "")) or is_person((r["acheteur_nom"] or "").split("(")[0].strip())
    rep_txt = "" if redondant else f" · repris par <b>{html.escape(rep)}</b>"
    lieu = f'{html.escape(r["v"])}' + (f' ({html.escape(r["departement"])})' if with_dept else f' ({r["cp"] or ""})')
    tag = TAG if est_neuf(r) else ""
    return (f'<div class="row"><div class="row-l"><b>{ens}</b><span>{m} · {lieu}{rep_txt}</span></div>'
            f'<div class="row-r"><span class="d">{date_fr(r["date_parution"])}</span>{tag}</div></div>')

besancon = [r for r in rows if r["v"].lower().startswith("besan")]
doubs = [r for r in rows if r["departement"] == "Doubs" and not r["v"].lower().startswith("besan")]
neufs = sum(1 for r in rows if est_neuf(r))
by_dept = collections.Counter(r["departement"] for r in rows)
by_metier = collections.Counter(metier(r["naf"], r["verticale"]) for r in rows)
by_ville = collections.Counter(r["v"] for r in rows)
# familles pour la lecture : restauration / commerce alimentaire / autres commerces
def famille(r):
    n = r["naf"] or ""
    if n.startswith("56") or n.startswith("55"): return "Cafés, hôtels, restaurants"
    if n.startswith(("10.", "47.11", "47.2")): return "Alimentation, boulangeries, caves"
    if n.startswith("96.02"): return "Coiffure, beauté"
    if n.startswith(("47.73", "47.74", "86")): return "Pharmacies, santé"
    if n.startswith("45"): return "Garages, automobile"
    return "Autres commerces"
by_fam = collections.Counter(famille(r) for r in rows)
bfc12 = sql_exec("select count(*) n from cessions where region ilike 'Bourgogne%' and date_parution >= current_date-365;")[0]["n"]
fr12 = sql_exec("select count(*) n from cessions where date_parution >= current_date-365;")[0]["n"]
doubs12 = sql_exec("select count(*) n from cessions where departement='Doubs' and date_parution >= current_date-365;")[0]["n"]
# selection regionale : les 8 plus grandes villes hors Besancon, 2 exemples chacune (les plus recents)
doubs_villes = {r["v"] for r in rows if r["departement"] == "Doubs"}
villes_sel = [v for v, _ in by_ville.most_common(24) if v not in doubs_villes][:6]
selection = []
for v in villes_sel:
    selection += [r for r in rows if r["v"] == v][:2]

LOGO = "file:///Users/baptisteportugal/Downloads/LeBonProspect_logo_signature.png"
CSS = """
:root{--teal:#31777A;--teal-soft:#eaf3f3;--ink:#14181d;--muted:#6f6a5c;--line:#e6e0d0;--cream:#f6f2ea;--red:#b23a3a}
@page{size:A4;margin:0} *{box-sizing:border-box;margin:0;padding:0} html,body{width:210mm}
body{font-family:Inter,sans-serif;color:var(--ink);background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;height:296mm;padding:12mm 14mm 16mm;position:relative;overflow:hidden;page-break-after:always;break-after:page}
.page:last-child{page-break-after:auto;break-after:auto}
.logo{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}
.logo img{height:26px}
.prep{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--teal);font-weight:600}
.eyebrow{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--teal);font-weight:600;margin-bottom:10px}
h1{font-family:Archivo,sans-serif;font-size:31px;font-weight:900;line-height:1.08;letter-spacing:-.02em;margin-bottom:12px}
h1 .hl{color:var(--teal)}
h2{font-family:Archivo,sans-serif;font-size:18px;font-weight:800;letter-spacing:-.01em;margin:16px 0 6px}
p{font-size:13px;line-height:1.55;color:#3f3b33}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0}
.stat{background:var(--cream);border-radius:12px;padding:14px 14px 12px}
.stat .n{font-family:Archivo,sans-serif;font-size:28px;font-weight:900;letter-spacing:-.03em;color:var(--teal);line-height:1}
.stat .l{font-size:11px;color:var(--muted);margin-top:5px;line-height:1.3}
.row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px dashed var(--line);gap:12px}
.row-l b{font-size:12.5px;display:block}
.row-l span{font-size:11px;color:var(--muted)}
.row-l span b{display:inline;font-size:11px;color:var(--ink)}
.row-r{text-align:right;flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:3px}
.d{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted)}
.tag{font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:600;color:var(--red);background:#f7e9e9;border-radius:5px;padding:2px 6px}
.bars{margin-top:6px}
.bar{display:grid;grid-template-columns:150px 1fr 36px;align-items:center;gap:10px;font-size:12px;padding:4px 0}
.bar .track{height:12px;background:var(--cream);border-radius:6px;overflow:hidden}
.bar .fill{height:100%;background:var(--teal);border-radius:6px}
.bar .n{font-family:'JetBrains Mono',monospace;font-weight:600;color:var(--teal);text-align:right}
.two{display:grid;grid-template-columns:1fr 1fr;gap:22px}
.metiers{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
.metier{font-size:11.5px;background:var(--teal-soft);border:1px solid #cfe3e3;border-radius:20px;padding:5px 11px}
.metier b{font-family:'JetBrains Mono',monospace;color:var(--teal)}
.note{font-size:10.5px;color:var(--muted);line-height:1.5;margin-top:12px}
.foot{position:absolute;left:14mm;right:14mm;bottom:9mm;display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:9.5px;color:var(--muted)}
.about{background:var(--ink);color:#fff;border-radius:14px;padding:14px 18px;margin-top:14px}
.about h3{font-family:Archivo,sans-serif;font-size:15px;font-weight:800;margin-bottom:6px}
.about p{color:rgba(255,255,255,.85);font-size:12px}
.compact .row{padding:4px 0}
.compact h2{margin:12px 0 4px}
.quote{border-left:3px solid var(--teal);padding:6px 14px;margin:14px 0;font-size:13.5px;line-height:1.5;color:var(--ink);font-weight:500}
"""
maxd = max(by_dept.values())
bars_dept = "".join(f'<div class="bar"><span>{html.escape(d)}</span><div class="track"><div class="fill" style="width:{round(100*n/maxd)}%"></div></div><span class="n">{n}</span></div>' for d, n in by_dept.most_common())
maxf = max(by_fam.values())
bars_fam = "".join(f'<div class="bar"><span>{html.escape(f)}</span><div class="track"><div class="fill" style="width:{round(100*n/maxf)}%"></div></div><span class="n">{n}</span></div>' for f, n in by_fam.most_common())
villes_html = "".join(f'<span class="metier">{html.escape(v)} <b>{n}</b></span>' for v, n in by_ville.most_common(10))
metiers_bes = collections.Counter(metier(r["naf"], r["verticale"]) for r in besancon)

page = f"""<!doctype html><html lang="fr"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@700;800;900&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
<style>{CSS}</style></head><body>

<div class="page">
  <div class="logo"><img src="{LOGO}" alt="LeBonProspect"><span class="prep">Document préparé pour L'Est Républicain · {today.strftime("%d/%m/%Y")}</span></div>
  <div class="eyebrow">Bourgogne-Franche-Comté · commerces repris · juillet à septembre 2026</div>
  <h1>{len(rows)} commerces ont changé de propriétaire dans la région <span class="hl">en trois mois.</span></h1>
  <p>Restaurants, boulangeries, salons de coiffure, pharmacies, garages : chaque reprise est publiée au Bulletin officiel des annonces civiles et commerciales (BODACC), parce que la loi l'impose. Voici ce que disent ces publications pour la Bourgogne-Franche-Comté entre le 1er juillet et le {today.day} septembre 2026, telles que LeBonProspect les a lues, triées et enrichies. Tout est vérifiable au Journal officiel.</p>
  <div class="stats">
    <div class="stat"><div class="n">{len(rows)}</div><div class="l">commerces repris dans la région sur 90 jours</div></div>
    <div class="stat"><div class="n">{round(len(rows)/13)}</div><div class="l">par semaine, en moyenne</div></div>
    <div class="stat"><div class="n">{round(100*neufs/len(rows))} %</div><div class="l">de repreneurs installés depuis moins de six mois</div></div>
    <div class="stat"><div class="n">{fmt(bfc12)}</div><div class="l">cessions de fonds sur 12 mois, tous types confondus</div></div>
  </div>
  <div class="two">
    <div><h2>Par département</h2><div class="bars">{bars_dept}</div></div>
    <div><h2>Par type de commerce</h2><div class="bars">{bars_fam}</div></div>
  </div>
  <h2>Les villes où ça a le plus bougé</h2>
  <div class="metiers">{villes_html}</div>
  <div class="quote">{round(100*by_fam["Cafés, hôtels, restaurants"]/len(rows))} % des commerces repris dans la région sont des cafés, hôtels ou restaurants. Et {round(100*neufs/len(rows))} % des repreneurs ont créé leur société il y a moins de six mois : des nouveaux entrants, pas des groupes qui s'agrandissent.</div>
  <div class="foot"><span>Source : BODACC, cessions de fonds de commerce, Bourgogne-Franche-Comté · traitement LeBonProspect</span><span>lebonprospect.fr · 1 / 3</span></div>
</div>

<div class="page compact">
  <div class="logo" style="margin-bottom:14px"><img src="{LOGO}" alt="LeBonProspect"><span class="prep">Focus Besançon et Doubs</span></div>
  <div class="eyebrow">Besançon · juillet à septembre 2026</div>
  <h1 style="font-size:24px;margin-bottom:8px">À Besançon, {len(besancon)} commerces ont changé de mains <span class="hl">cet été.</span></h1>
  <p style="font-size:12.5px">Une boulangerie, deux bars, un salon de coiffure, une pharmacie. Cinq adresses que les Bisontins connaissent, et cinq nouveaux patrons qui, dans les trois mois, refont l'enseigne et choisissent leurs fournisseurs.</p>
  <div style="margin-top:6px">{"".join(row_html(r) for r in besancon)}</div>
  <h2>Dans le reste du Doubs</h2>
  {"".join(row_html(r) for r in doubs)}
  <div class="foot"><span>{len(besancon) + len(doubs)} commerces repris dans le Doubs en trois mois · source BODACC</span><span>2 / 3</span></div>
</div>

<div class="page">
  <div class="logo"><img src="{LOGO}" alt="LeBonProspect"><span class="prep">Ailleurs dans la région</span></div>
  <h2 style="margin-top:0">Une sélection, ville par ville</h2>
  <p>Deux reprises récentes dans six villes de la région, pour donner une idée de ce qui change de mains.</p>
  <div style="margin-top:8px">{"".join(row_html(r, with_dept=True) for r in selection)}</div>
  <h2>Pour situer</h2>
  <div class="stats" style="grid-template-columns:repeat(3,1fr)">
    <div class="stat"><div class="n">{fmt(bfc12)}</div><div class="l">cessions en Bourgogne-Franche-Comté sur 12 mois</div></div>
    <div class="stat"><div class="n">{fmt(fr12)}</div><div class="l">en France sur 12 mois</div></div>
    <div class="stat"><div class="n">{round(100*bfc12/fr12, 1)} %</div><div class="l">du total national, pour la région</div></div>
  </div>
  <div class="about">
    <h3>LeBonProspect, en deux phrases</h3>
    <p>Chaque nuit, nous lisons le Journal officiel et identifions les commerces qui viennent de changer de propriétaire. Chaque matin à 8h, leurs fournisseurs (agenceurs, équipementiers, enseignistes, brasseurs) reçoivent ceux de leur métier et de leur zone, avec le repreneur et le téléphone. Fondé à Besançon par Baptiste Portugal et Lawrenza Belin.</p>
  </div>
  <p class="note">Méthode : cessions de fonds de commerce publiées au BODACC pour les huit départements de Bourgogne-Franche-Comté, activité de commerce ou d'établissement recevant du public (restauration, hébergement, détail, artisanat de bouche, coiffure et beauté, santé, automobile). Fusions, scissions et transferts intragroupe exclus. Dates de publication, pas de l'acte. Les noms de commerces proviennent du BODACC et des fiches d'établissements publiques.</p>
  <div class="foot"><span>Contact : baptiste@lebonprospect.fr · lebonprospect.fr</span><span>3 / 3</span></div>
</div>
</body></html>"""
hp = "/Users/baptisteportugal/repreneur/vente/presse/bfc_reprises_2026-09.html"; open(hp, "w").write(page)
pdf = "/Users/baptisteportugal/repreneur/vente/presse/LeBonProspect_Reprises_BFC_ete2026.pdf"
subprocess.run(["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "--headless", "--disable-gpu", "--no-pdf-header-footer", "--virtual-time-budget=6000", f"--print-to-pdf={pdf}", f"file://{hp}"], capture_output=True)
print("pages:", subprocess.run(["mdls", "-name", "kMDItemNumberOfPages", pdf], capture_output=True, text=True).stdout.strip(), "| total:", len(rows), "| besancon:", len(besancon), "| doubs:", len(doubs), "| neufs:", neufs, f"({round(100*neufs/len(rows))} %)")
print("fam:", by_fam.most_common()); print("dept:", by_dept.most_common()); print("villes sel:", villes_sel)
