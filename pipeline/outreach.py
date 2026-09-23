#!/usr/bin/env python3
"""LeBonProspect — outreach « un lead gratuit ».

Chaque prospect du pool (fournisseur CHR) reçoit UNE vraie reprise CHR de son département,
complète (nom, adresse, dirigeant, téléphone non masqué), publiée dans les 10 derniers jours.
Pas de pitch : « appelez-le, si ça donne quelque chose on en parle ».

Règles :
  - envoi uniquement aux prospects avec email, non exclus, jamais contactés par email
  - un envoi par prospect, jamais deux (outreach_sent_at)
  - la reprise doit être dans le même département que le prospect (sinon même région, sinon on passe)
  - la reprise doit avoir un téléphone (sinon l'email ne vaut rien)
  - texte court, sobre, sans emoji ni tiret cadratin, signé par un humain (Lawrenza)
  - lien de retrait en pied (RGPD, prospection B2B)

Usage : python3 outreach.py --limit 30 [--dry-run] [--test email@x.fr]
"""
import sys, os, json, html, argparse, datetime, urllib.request, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from load_db import sql_exec, env
from digest import date_fr

FROM = "Lawrenza de LeBonProspect <lawrenza@lebonprospect.fr>"
REPLY_TO = "lawrenza@lebonprospect.fr"
TEAL, INK, MUTED = "#31777A", "#14181D", "#6f6a5c"

# département du prospect : déduit de sa ville via la table cessions (ville -> departement), sinon via région seule
def dept_of(p):
    v = (p.get("ville") or "").split(",")[0].strip().replace("'", "''")
    if v:
        r = sql_exec(f"select departement, count(*) n from cessions where ville ilike '{v}%' and departement is not null group by 1 order by 2 desc limit 1;")
        if r: return r[0]["departement"]
    return None

def pick_lead(dept, region, exclude_ids):
    ex = f"and id not in ({','.join(map(str, exclude_ids))})" if exclude_ids else ""
    base = f"""select * from cessions where verticale='chr' and telephone is not null and acheteur_nom is not null
               and date_parution >= current_date - 10 {ex}"""
    if dept:
        r = sql_exec(base + f" and departement='{dept.replace(chr(39), chr(39)*2)}' order by date_parution desc, (acheteur_date_creation is not null) desc limit 1;")
        if r: return r[0], "departement"
    if region:
        r = sql_exec(base + f" and region='{region.replace(chr(39), chr(39)*2)}' order by date_parution desc limit 1;")
        if r: return r[0], "region"
    return None, None

LAW_CLOSER_ID = "96686993-3801-4d3d-88ca-438d1adbd8ca"   # compte "Lawrenza Closing" (essai_autorise) : la page affiche l'offre essai 7 jours

def slugify(x):
    out = (x or "").lower()
    for a, b in {"é":"e","è":"e","ê":"e","à":"a","ç":"c","ô":"o","î":"i","û":"u","ë":"e","ï":"i","â":"a","ù":"u"}.items(): out = out.replace(a, b)
    return re.sub(r"^-+|-+$", "", re.sub(r"[^a-z0-9]+", "-", out))[:40]

def ensure_page(p):
    """Crée (ou réutilise) la page personnalisée /pour/<slug> du prospect, rattachée au compte de Law."""
    slug = slugify(p["societe"])
    esc = lambda x: (x or "").replace("'", "''")
    sql_exec(f"""insert into generated_pages (slug, societe, categorie, region, ville, closer_id)
                 values ('{esc(slug)}', '{esc(p["societe"])}', '{esc(p.get("categorie"))}', '{esc(p.get("region"))}', '{esc(p.get("ville"))}', '{LAW_CLOSER_ID}')
                 on conflict (slug) do nothing;""")
    url = f"https://www.lebonprospect.fr/pour/{slug}"
    sql_exec(f"update prospects_pool set lien_teaser='{url}' where id={p['id']} and lien_teaser is null;")
    return url

def clean_name(d):
    return re.sub(r"\s*\([^)]*\)", "", d).strip().title()

SMALL = {"de", "du", "des", "la", "le", "les", "et", "au", "aux", "en", "sur", "sous", "chez", "d", "l", "un", "une"}
def titre(s):
    """« HOTEL RESTAURANT DE LA POSTE, CATALE » -> « Hotel Restaurant de la Poste ».
    Le BODACC concatène souvent plusieurs enseignes/sigles séparés par des virgules : on garde la première."""
    s = (s or "").split(",")[0].strip()
    s = re.sub(r"\s+", " ", s)
    out = []
    for i, w in enumerate(s.split()):
        lw = w.lower()
        if i > 0 and lw in SMALL: out.append(lw)
        elif len(w) <= 3 and w.isupper() and w.isalpha() and i > 0 and lw not in SMALL: out.append(w)
        else: out.append("-".join(x.capitalize() for x in lw.split("-")))
    return " ".join(out)

def ville_courte(v):
    """« Marseille 8e Arrondissement » -> « Marseille 8e » ; « Lyon, Francheville » -> « Lyon »."""
    v = (v or "").split(",")[0].strip()
    return re.sub(r"\s+Arrondissement$", "", v, flags=re.I)

def render(p, lead, scope, page_url):
    # nom court de l'entreprise : on coupe au premier tiret / virgule (« G.R.INOX - Chaudronnier, ... » -> « G.R.INOX »)
    societe_txt = re.split(r"\s+[-–|·]\s+|,", p["societe"])[0].strip() or p["societe"]
    societe = html.escape(societe_txt)
    raw_nom = lead.get("acheteur_nom") or ""
    raw_com = lead.get("commercant") or ""
    commerce_txt = titre(raw_com) or "un établissement"
    commerce = html.escape(commerce_txt)
    nom_txt = titre(raw_nom)
    nom = html.escape(nom_txt) if nom_txt and nom_txt.lower() != commerce_txt.lower() else ""
    ville_txt = ville_courte(lead.get("ville")); ville = html.escape(ville_txt)
    dept = html.escape(lead.get("departement") or "")
    adresse = html.escape((lead.get("acheteur_adresse") or "").title())
    tel = lead.get("telephone") or ""
    dirs = lead.get("acheteur_dirigeants") or []
    if isinstance(dirs, str): dirs = [d.strip() for d in dirs.strip("{}").split(",") if d.strip()]
    dirigeant = html.escape(", ".join(clean_name(d) for d in dirs[:2])) if dirs else ""
    pub = date_fr(lead["date_parution"])
    creation = lead.get("acheteur_date_creation")
    neuf = ""
    if creation:
        age = (datetime.date.today() - datetime.date.fromisoformat(str(creation))).days
        if age <= 180: neuf = "Société créée il y a moins de six mois : il n'a encore aucun fournisseur attitré."
    ou = f"dans le {dept}" if scope == "departement" else f"en {html.escape(lead.get('region') or '')}"
    subject = f"{commerce_txt} ({ville_txt}) a changé de propriétaire"

    # Couleurs posées en dur sur chaque cellule (bgcolor + style) : Gmail sombre ne les inverse pas.
    rows = []
    if nom: rows.append(f'<tr><td style="padding:2px 0;font-size:14px;color:{INK};"><b>Repreneur :</b> {nom}</td></tr>')
    if dirigeant: rows.append(f'<tr><td style="padding:2px 0;font-size:14px;color:{INK};"><b>Dirigeant :</b> {dirigeant}</td></tr>')
    if adresse: rows.append(f'<tr><td style="padding:2px 0;font-size:14px;color:{INK};"><b>Adresse :</b> {adresse}</td></tr>')
    rows.append(f'<tr><td style="padding:2px 0;font-size:14px;color:{INK};"><b>Téléphone :</b> <a href="tel:{tel.replace(" ", "")}" style="color:{TEAL};font-weight:bold;text-decoration:none;">{tel}</a></td></tr>')
    if neuf: rows.append(f'<tr><td style="padding:8px 0 0;font-size:13px;color:#b23a3a;font-weight:bold;">{neuf}</td></tr>')

    P = f'style="font-size:15px;line-height:1.55;color:{INK};padding-bottom:16px;font-family:Arial,Helvetica,sans-serif;"'
    body = f"""<!doctype html><html><head><meta charset="utf-8"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"></head>
<body style="margin:0;padding:0;background:#f6f2ea;" bgcolor="#f6f2ea">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f6f2ea" style="background:#f6f2ea;"><tr><td align="center" style="padding:28px 14px;">
<table role="presentation" width="580" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="max-width:580px;background:#ffffff;border-radius:16px;">
<tr><td style="padding:26px 34px 8px;"><img src="https://www.lebonprospect.fr/email/logo-email.png" width="179" height="37" alt="LeBonProspect" style="display:block;border:0;"></td></tr>
<tr><td style="padding:0 34px 22px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:{TEAL};font-weight:bold;">Le repreneur avant tout le monde</td></tr>
<tr><td style="padding:0 34px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td {P}>Bonjour,</td></tr>
<tr><td {P}>Je vous écris pour une raison précise : <b>{commerce}</b>, à {ville}, vient de changer de propriétaire. La cession est parue au Journal officiel le {pub}. Le repreneur refait tout dans les trois mois, et il n'a encore appelé personne.</td></tr>
<tr><td style="padding:0 0 18px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#fbfaf7" style="border:1.5px solid #e6e0d0;border-radius:12px;background:#fbfaf7;"><tr><td style="padding:16px 18px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;">
<tr><td style="font-size:16px;font-weight:bold;color:{INK};padding-bottom:2px;">{commerce}</td></tr>
<tr><td style="font-size:12.5px;color:{TEAL};font-weight:bold;padding-bottom:8px;">{ville} · {dept} · publié le {pub}</td></tr>
{''.join(rows)}
</table></td></tr></table></td></tr>
<tr><td {P}>Il est à vous. Appelez-le, présentez-vous, et si ça donne quelque chose, on en reparle.</td></tr>
<tr><td {P}>C'est ce que nous faisons chaque matin pour les fournisseurs des cafés, hôtels et restaurants : les reprises {ou}, avec le nom du repreneur et le numéro, à 8h dans votre boîte mail.</td></tr>
<tr><td style="padding:2px 0 22px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="{TEAL}" style="background:{TEAL};border-radius:10px;">
<a href="{page_url}" style="display:inline-block;padding:13px 22px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;">Voir les reprises de mon secteur</a></td></tr></table>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:{MUTED};padding-top:10px;line-height:1.5;">Une page préparée pour {societe} : les chiffres de votre zone, les dernières reprises, et <b style="color:{INK};">7 jours d'essai gratuit</b>, sans engagement. Vous recevez la première liste demain à 8h.</div>
</td></tr>
<tr><td {P}>Si vous préférez en parler de vive voix, répondez à ce message et je vous rappelle.</td></tr>
<tr><td style="padding:6px 0 26px;">
<table role="presentation" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;"><tr>
<td style="padding-right:14px;border-right:2px solid {TEAL};"><img src="https://www.lebonprospect.fr/email/logo-email.png" width="120" height="25" alt="LeBonProspect" style="display:block;border:0;"></td>
<td style="padding-left:14px;font-size:14px;line-height:1.45;color:{INK};"><b>Lawrenza</b><br><span style="color:{MUTED};font-size:12.5px;">Responsable développement commercial<br><a href="https://www.lebonprospect.fr" style="color:{TEAL};text-decoration:none;">lebonprospect.fr</a> · <a href="mailto:lawrenza@lebonprospect.fr" style="color:{TEAL};text-decoration:none;">lawrenza@lebonprospect.fr</a></span></td>
</tr></table></td></tr>
</table></td></tr>
<tr><td style="padding:16px 34px 26px;border-top:1px solid #eee9dc;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;color:{MUTED};">
Vous recevez ce message parce que {societe} fournit des établissements CHR. Les informations ci-dessus proviennent du Bulletin officiel des annonces civiles et commerciales et de sources publiques, elles sont vérifiables. Pour ne plus être contacté, <a href="mailto:lawrenza@lebonprospect.fr?subject=Ne%20plus%20me%20contacter" style="color:{MUTED};">répondez « stop »</a> : votre fiche est retirée le jour même.
</td></tr>
</table></td></tr></table></body></html>"""
    return subject, body

def send(to, subject, body):
    req = urllib.request.Request("https://api.resend.com/emails",
        data=json.dumps({"from": FROM, "reply_to": REPLY_TO, "to": [to], "subject": subject, "html": body,
                         "headers": {"List-Unsubscribe": "<mailto:lawrenza@lebonprospect.fr?subject=stop>"}}).encode(),
        headers={"Authorization": f"Bearer {env('RESEND_API_KEY')}", "Content-Type": "application/json",
                 "User-Agent": "lebonprospect/1.0"}, method="POST")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=30)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--test", help="envoie UN email de test à cette adresse (premier prospect éligible)")
    a = ap.parse_args()
    sql_exec("""alter table prospects_pool add column if not exists outreach_sent_at timestamptz,
                add column if not exists outreach_lead_id bigint, add column if not exists outreach_scope text;""")
    rows = sql_exec(f"""select id, societe, ville, region, email, categorie from prospects_pool
        where not exclu_pool and email is not null and outreach_sent_at is null and closer_id is null
        and statut is distinct from 'mauvais_prospect'
        order by (case when type_num='mobile' then 2 else 0 end + case when nb_avis between 6 and 60 then 2 else 0 end) desc, id
        limit {a.limit * 2};""")
    used = [r["outreach_lead_id"] for r in sql_exec("select outreach_lead_id from prospects_pool where outreach_lead_id is not null;")]
    sent = 0
    for p in rows:
        if sent >= a.limit: break
        dept = dept_of(p)
        lead, scope = pick_lead(dept, p.get("region"), used)
        if not lead:
            continue
        page_url = ensure_page(p) if not a.dry_run else f"https://www.lebonprospect.fr/pour/{slugify(p['societe'])}"
        subject, body = render(p, lead, scope, page_url)
        if a.test:
            print(f"TEST -> {a.test} | prospect: {p['societe']} ({p['ville']}) | lead: {lead.get('commercant')} {lead.get('ville')} | {subject}")
            open("/tmp/outreach_preview.html", "w").write(body)
            if not a.dry_run: print(send(a.test, subject, body))
            return
        print(f"{'DRY ' if a.dry_run else ''}{p['email']:42s} <- {subject[:70]}  [{scope}]")
        if not a.dry_run:
            try:
                send(p["email"], subject, body)
                sql_exec(f"update prospects_pool set outreach_sent_at=now(), outreach_lead_id={lead['id']}, outreach_scope='{scope}' where id={p['id']};")
            except Exception as e:
                print("   ERREUR envoi:", e); continue
        used.append(lead["id"])
        sent += 1
    print(f"{sent} email(s) {'simulés' if a.dry_run else 'envoyés'}")

if __name__ == "__main__":
    main()
