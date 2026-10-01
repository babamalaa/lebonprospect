#!/usr/bin/env python3
"""LeBonProspect — générateur + envoyeur du digest email quotidien.
LE produit : l'email de 8h. Rendu compatible Gmail/Outlook/Apple Mail
(tables, CSS inline, system fonts, zéro webfont, zéro SVG).

Usage:
  python3 digest.py --verticale chr --region "Auvergne-Rhône-Alpes" --date 2026-09-06 --out preview.html
  python3 digest.py --verticale chr --region "..." --send test@exemple.fr   (si RESEND_API_KEY)
  python3 digest.py --all   (envoie à tous les abonnés actifs — le mode cron)
"""
import json, os, sys, argparse, datetime, html, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from load_db import sql_exec, env

TEAL = "#31777A"; TEAL_SOFT = "#e3efef"; INK = "#14181d"; PAPER = "#fdfbf5"
RED = "#d64a2e"; MUTED = "#6f6a5c"; LINE = "#e6e0d0"; OK = "#1e7a4d"

VERT_LABELS = {
    "chr": "restaurants, bars & hôtels",
    "alimentaire": "commerces alimentaires",
    "coiffure_beaute": "coiffure & beauté",
    "garage_auto": "garages & auto",
    "pressing_services": "pressings & services",
    "sante": "pharmacies & santé",
    "fleuriste": "fleuristes",
    "tabac_presse": "tabacs & presse",
    "tous": "tous commerces",
    "commerces": "tous commerces",
}

MONTHS_FR = ["", "janvier", "février", "mars", "avril", "mai", "juin", "juillet",
             "août", "septembre", "octobre", "novembre", "décembre"]

def date_fr(iso):
    d = datetime.date.fromisoformat(str(iso))
    return f"{d.day} {MONTHS_FR[d.month]} {d.year}"

COMMERCES_SQL = ("(coalesce(naf_fonds, acheteur_naf) ~ '^(47|55|56|10\\.71|10\\.13|96\\.0[12]|45\\.|93\\.13|96\\.09|86\\.9|32\\.5|79\\.90|43\\.)' "
                 "or verticale in ('chr','alimentaire','coiffure_beaute','garage_auto','fleuriste','tabac_presse','pressing_services','sante'))")
NOFUSION_SQL = "(acte_descriptif is null or (acte_descriptif not ilike '%fusion%' and acte_descriptif not ilike '%scission%'))"

def fetch_leads(verticale, region=None, departement=None, date=None, villes=None):
    # verticale "tous" = toutes activités (abonné zone sur mesure : enseigniste, assureur, caisse...)
    # "tous" = toutes les activités brutes ; "commerces" = tous les vrais commerces / établissements
    # (restauration, hébergement, détail, artisanat de bouche, coiffure, santé, auto...) hors fusions, scissions,
    # holdings, sociétés immobilières et industriels : c'est ce qu'un fournisseur multi-métiers veut réellement.
    if verticale == "tous":
        where = []
    elif verticale == "commerces":
        where = [COMMERCES_SQL, NOFUSION_SQL]
    else:
        where = [f"verticale = '{verticale}'"]
    if villes:
        vl = ",".join("'" + v.replace("'", "''") + "'" for v in villes)
        where.append(f"split_part(ville, ',', 1) in ({vl})")
    if region:
        where.append(f"region = '{region.replace(chr(39), chr(39)*2)}'")
    if departement:
        where.append(f"departement = '{departement.replace(chr(39), chr(39)*2)}'")
    where.append(f"date_parution = '{date}'" if date else
                 "date_parution = (select max(date_parution) from cessions)")
    q = f"""select * from cessions where {' and '.join(where)}
            order by (telephone is not null) desc, departement, ville limit 60;"""
    return sql_exec(q)

def _vert_where(verticale):
    if verticale == "tous": return []
    if verticale == "commerces": return [COMMERCES_SQL, NOFUSION_SQL]
    return [f"verticale = '{verticale}'"]

def fetch_range(verticale, depts, date_from=None, date_to=None, limit=60):
    """Reprises d'une liste de départements sur une période, les plus récentes d'abord."""
    dl = ",".join("'" + d.replace("'", "''") + "'" for d in depts)
    where = _vert_where(verticale) + [f"departement in ({dl})"]
    if date_from: where.append(f"date_parution >= '{date_from}'")
    if date_to: where.append(f"date_parution <= '{date_to}'")
    return sql_exec(f"select * from cessions where {' and '.join(where)} order by date_parution desc, (telephone is not null) desc, departement, ville limit {int(limit)};")

def lead_block(r):
    nom = html.escape(r.get("acheteur_nom") or r.get("commercant") or "Repreneur")
    ville = html.escape(r.get("ville") or "")
    dept = html.escape(r.get("departement") or "")
    dirigeants = r.get("acheteur_dirigeants") or []
    if isinstance(dirigeants, str):
        dirigeants = [d.strip() for d in dirigeants.strip("{}").split(",") if d.strip()]
    def clean_name(d):
        import re as _re
        d = _re.sub(r"\s*\([^)]*\)", "", d)   # retire "(Nom d'usage)" redondant
        return d.strip().title()
    dirigeants_txt = html.escape(", ".join(clean_name(d) for d in dirigeants[:2])) if dirigeants else ""
    adresse = html.escape(r.get("acheteur_adresse") or "")
    tel = r.get("telephone")
    creation = r.get("acheteur_date_creation")
    fresh = ""
    if creation:
        age = (datetime.date.today() - datetime.date.fromisoformat(str(creation))).days
        fresh = ("Société toute neuve : budgets ouverts" if age <= 180
                 else f"Acquéreur établi depuis {str(creation)[:4]} : en expansion")
    tel_html = (f'<a href="tel:{tel.replace(" ", "")}" style="color:{TEAL};font-weight:bold;text-decoration:none;">{tel}</a>'
                if tel else f'<span style="color:{MUTED};">bientôt disponible</span>')
    rows = []
    if dirigeants_txt:
        rows.append(f'<tr><td style="padding:1px 0;font-size:13px;color:{INK};"><strong>Dirigeant(s)&nbsp;:</strong> {dirigeants_txt}</td></tr>')
    if adresse:
        rows.append(f'<tr><td style="padding:1px 0;font-size:13px;color:{INK};"><strong>Adresse&nbsp;:</strong> {adresse.title()}</td></tr>')
    rows.append(f'<tr><td style="padding:1px 0;font-size:13px;"><strong style="color:{INK};">Téléphone&nbsp;:</strong> {tel_html}</td></tr>')
    if fresh:
        rows.append(f'<tr><td style="padding:3px 0 0;font-size:12px;color:{RED};font-weight:bold;">{fresh}</td></tr>')
    return f"""
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="border-bottom:1px dashed {LINE};background:#ffffff;">
<tr><td style="padding:14px 18px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="font-size:15.5px;font-weight:bold;color:{INK};font-family:Arial,Helvetica,sans-serif;">{nom}</td></tr>
    <tr><td style="font-size:12.5px;color:{TEAL};font-weight:bold;padding:1px 0 5px;font-family:Arial,Helvetica,sans-serif;">{ville} · {dept}</td></tr>
    {''.join(rows)}
  </table>
</td></tr>
</table>"""

def render_digest(verticale, leads, region=None, departement=None, date=None, zone_label=None, headline=None, subline=None, intro_html="", outro_html=""):
    zone = zone_label or region or departement or "France entière"
    label = VERT_LABELS.get(verticale, verticale)
    date_str = date_fr(date or datetime.date.today().isoformat())
    n = len(leads)
    # group by departement for scannability
    by_dept = {}
    for r in leads:
        by_dept.setdefault(r.get("departement") or "Autre", []).append(r)
    sections = []
    for dept in sorted(by_dept):
        blocks = "".join(lead_block(r) for r in by_dept[dept])
        sections.append(f"""
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="margin-top:18px;border:2px solid {INK};border-radius:12px;background:#ffffff;">
<tr><td style="background:{TEAL};padding:9px 18px;border-radius:10px 10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#ffffff;letter-spacing:.4px;">
  {html.escape(dept.upper())} · {len(by_dept[dept])} reprise{'s' if len(by_dept[dept]) > 1 else ''}
</td></tr>
<tr><td>{blocks}</td></tr>
</table>""")
    plural = "s" if n > 1 else ""
    head_html = headline or f"{n} commerce{plural} viennent de changer de mains"
    sub_html = subline or f"{label.capitalize()} · {html.escape(zone)} · publiés hier au Journal officiel"
    intro_row = (f'<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:{INK};line-height:1.6;padding-top:14px;">{intro_html}</td></tr>' if intro_html else "")
    conseil_open, conseil_close = ("", "") if not headline else ("<!--", "-->")   # conseil du matin masqué pour les emails à titre personnalisé (bienvenue, filet, hebdo)
    outro_row = (f'<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:13.5px;color:{INK};line-height:1.6;padding-top:20px;">{outro_html}</td></tr>' if outro_html else "")
    return f"""<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>LeBonProspect · {n} reprise{plural}</title></head>
<body style="margin:0;padding:0;background:#ffffff;" bgcolor="#ffffff">
<div style="display:none;max-height:0;overflow:hidden;">{n} reprise{plural} de {label} · {html.escape(zone)} · {date_str}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="background:#ffffff;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

<tr><td style="padding-bottom:18px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="font-family:Arial Black,Arial,Helvetica,sans-serif;font-size:19px;font-weight:900;color:{INK};">
        <span style="display:inline-block;background:{TEAL};color:#ffffff;border-radius:7px;padding:3px 8px;font-size:14px;">LBP</span>
        &nbsp;LeBonProspect
      </td>
      <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:{MUTED};">{date_str}</td>
    </tr>
  </table>
</td></tr>

<tr><td style="font-family:Arial,Helvetica,sans-serif;">
  <div style="font-size:24px;font-weight:900;color:{INK};line-height:1.2;font-family:Arial Black,Arial,sans-serif;">
    {head_html}
  </div>
  <div style="font-size:14px;color:{MUTED};padding-top:6px;">
    {sub_html}
  </div>
</td></tr>
{intro_row}

{''.join(sections)}

{conseil_open}<tr><td style="padding-top:22px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{TEAL_SOFT};border-radius:10px;">
  <tr><td style="padding:14px 18px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:{INK};line-height:1.5;">
    <strong style="color:{TEAL};">Conseil du matin&nbsp;:</strong> un repreneur décide vite dans ses 90 premiers jours.
    Le premier fournisseur qui appelle avec un «&nbsp;félicitations pour la reprise&nbsp;» part avec une longueur d'avance.
  </td></tr>
  </table>
</td></tr>{conseil_close}

{outro_row}
<tr><td align="center" style="padding:26px 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:{MUTED};line-height:1.6;">
  LeBonProspect · chaque reprise est un acte officiel, vérifiable, jamais inventé<br>
  <a href="https://lebonprospect.fr" style="color:{TEAL};">lebonprospect.fr</a> ·
  <a href="https://www.lebonprospect.fr/mon-compte" style="color:{MUTED};">gérer mon abonnement</a>
</td></tr>

</table>
</td></tr>
</table>
</body></html>"""

def send_resend(to, subject, html_body, reply_to=None):
    key = env("RESEND_API_KEY")
    payload = {"from": "LeBonProspect <alerte@lebonprospect.fr>", "to": [to], "subject": subject, "html": html_body}
    if reply_to: payload["reply_to"] = reply_to
    req = urllib.request.Request("https://api.resend.com/emails",
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json",
                 "User-Agent": "lebonprospect/1.0"}, method="POST")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())

REPLY_TO = "lawrenza@lebonprospect.fr"

def _jours(iso): return date_fr(str(iso))

def _stats(leads):
    tel = sum(1 for r in leads if r.get("telephone"))
    neufs = 0
    for r in leads:
        c = r.get("acheteur_date_creation")
        if c and (datetime.date.fromisoformat(str(r["date_parution"])[:10]) - datetime.date.fromisoformat(str(c)[:10])).days <= 180: neufs += 1
    return tel, neufs

def build_email(kind, leads, zone, depts, date_to, date_from=None, nom=None):
    """Retourne (sujet, html). kind : bienvenue | quotidien | filet | hebdo. Ne touche pas à la base."""
    prenom = (nom or "").split(" ")[0] or ""
    hello = f"Bonjour {html.escape(prenom)}," if prenom else "Bonjour,"
    n = len(leads); plural = "s" if n > 1 else ""
    zone_h = html.escape(zone)
    sign = "<br><br>Baptiste et Lawrenza<br><span style=\"color:#6f6a5c;\">LeBonProspect</span>"
    outro_q = "Une question, un retour, un métier à ajouter ou à retirer ? Répondez simplement à cet email, on vous répond dans la journée."
    if kind == "bienvenue":
        subject = f"Bienvenue : {n} commerce{plural} repris dans vos départements ces 14 derniers jours"
        intro = (f"{hello}<br><br>Voici comment va se passer votre essai de trois mois. Chaque matin, vous recevez ici les commerces repris la veille dans vos départements "
                 f"(<b>{zone_h}</b>), tous métiers confondus, avec le repreneur, l'adresse et le téléphone quand il est disponible. "
                 f"Les jours où rien n'est publié chez vous, vous recevez un court message avec les plus récentes plutôt qu'un silence. Chaque lundi, un récapitulatif de la semaine.<br><br>"
                 f"Pour démarrer, voici ce qui s'est passé chez vous du {_jours(date_from)} au {_jours(date_to)}.")
        return subject, render_digest("commerces", leads, date=str(date_to), zone_label=zone,
            headline=f"{n} commerce{plural} repris chez vous ces 14 derniers jours",
            subline=f"{zone_h} · du {_jours(date_from)} au {_jours(date_to)} · publiés au Journal officiel",
            intro_html=intro, outro_html=outro_q + sign)
    if kind == "filet":
        subject = "Pas de reprise hier dans vos départements · les cinq plus récentes"
        intro = (f"Aucun commerce repris n'a été publié hier dans vos départements. Pour que ce silence ne ressemble pas à une panne, "
                 f"voici les {n} plus récents. Dès qu'une reprise sera publiée chez vous, vous la recevez le lendemain matin.")
        return subject, render_digest("commerces", leads, date=str(date_to), zone_label=zone,
            headline="Rien de nouveau hier chez vous",
            subline=f"{zone_h} · les {n} reprises les plus récentes",
            intro_html=intro)
    if kind == "hebdo":
        tel, neufs = _stats(leads)
        par_dept = {}
        for r in leads: par_dept[r.get("departement") or "Autre"] = par_dept.get(r.get("departement") or "Autre", 0) + 1
        detail = ", ".join(f"{html.escape(d)} {c}" for d, c in sorted(par_dept.items(), key=lambda x: -x[1]))
        subject = f"Votre semaine : {n} commerce{plural} repris · {zone}"
        intro = (f"Sur la semaine, <b>{n} commerce{plural}</b> repris chez vous ({detail}). "
                 f"<b>{tel}</b> avec un téléphone, <b>{neufs}</b> dont le repreneur a créé sa société il y a moins de six mois, donc sans fournisseur attitré.")
        return subject, render_digest("commerces", leads, date=str(date_to), zone_label=zone,
            headline=f"Votre semaine : {n} commerce{plural} repris",
            subline=f"{zone_h} · du {_jours(date_from)} au {_jours(date_to)}",
            intro_html=intro, outro_html="Ce récapitulatif réunit les reprises déjà reçues cette semaine : rien de nouveau à traiter, mais tout est là au même endroit." + sign)
    # quotidien (identique au digest habituel, plus la zone et un pied de réponse)
    subject = f"{n} reprise{plural} de commerces · {zone}"
    return subject, render_digest("commerces", leads, date=str(date_to), zone_label=zone, outro_html=outro_q)

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--verticale", default="chr")
    ap.add_argument("--region")
    ap.add_argument("--departement")
    ap.add_argument("--date")
    ap.add_argument("--out", default="digest_preview.html")
    ap.add_argument("--send", help="adresse email de test (nécessite RESEND_API_KEY)")
    args = ap.parse_args()
    leads = fetch_leads(args.verticale, args.region, args.departement, args.date)
    if not leads:
        sys.exit("Aucun lead pour ces critères.")
    html_out = render_digest(args.verticale, leads, args.region, args.departement, args.date)
    out = os.path.join(HERE, "..", "teasers", args.out)
    with open(out, "w") as f:
        f.write(html_out)
    print(f"OK: {len(leads)} leads → {out}")
    if args.send:
        zone = args.region or args.departement or "France"
        n = len(leads)
        subj = f"{n} reprise{'s' if n > 1 else ''} de commerces · {zone}"
        r = send_resend(args.send, subj, html_out)
        print("Envoyé:", r)
