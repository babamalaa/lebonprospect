#!/usr/bin/env python3
"""LeBonProspect : rappel J+5 aux essais gratuits démarrés depuis le dashboard.
Appelé par le cron après send_digests. Un seul rappel par abonné (essai_rappel_at).
Usage: python3 remind_essais.py [--dry-run]
"""
import os, sys, argparse, datetime, html, json, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from load_db import sql_exec, env
from digest import date_fr

# Payment Links directs (sans nouvel essai Stripe) : l'essai gratuit a déjà eu lieu dans le dashboard.
LINKS = {
    "departemental": "https://buy.stripe.com/8x26oH2sN1i4gpv0b78N200",
    "regional": "https://buy.stripe.com/14A5kD4AVe4Q7SZe1X8N201",
}
TEAL = "#31777A"
# Cron quotidien à 05:00 UTC, essai de 7 jours démarré en journée : une fenêtre de 72 h
# fait partir le rappel le matin de J+5 (48 h le repousserait à J+6).
FENETRE = datetime.timedelta(hours=72)

def send_transactional(to, subject, html_body):
    """Comme digest.send_resend, mais depuis l'adresse transactionnelle (jamais alerte@)."""
    key = env("RESEND_API_KEY")
    req = urllib.request.Request("https://api.resend.com/emails",
        data=json.dumps({"from": "LeBonProspect <onboarding@lebonprospect.fr>",
                         "to": [to], "subject": subject, "html": html_body}).encode(),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json",
                 "User-Agent": "lebonprospect/1.0"}, method="POST")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())

def a_rappeler(s, now):
    """Essai dashboard, non payé, non rappelé, dont la fin est dans moins de 72 h (et pas encore passée)."""
    if not s.get("essai") or s.get("essai_source") != "dashboard":
        return False
    if s.get("premier_paiement_at") or s.get("essai_rappel_at"):
        return False
    fin = s.get("essai_fin")
    if not fin:
        return False
    fin_dt = datetime.datetime.fromisoformat(str(fin).replace("Z", "+00:00"))
    if fin_dt.tzinfo is None:
        fin_dt = fin_dt.replace(tzinfo=datetime.timezone.utc)
    reste = fin_dt - now
    return datetime.timedelta(0) < reste <= FENETRE

def render_rappel(s):
    plan = s.get("plan") or "regional"
    link = LINKS.get(plan, LINKS["regional"])
    prix = "149" if plan == "departemental" else "299"
    fin = date_fr(str(s.get("essai_fin"))[:10])
    societe = html.escape(s.get("societe") or "")
    return f"""<!doctype html><html lang="fr"><body style="margin:0;padding:0;background:#ffffff;" bgcolor="#ffffff">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;font-family:Arial,Helvetica,sans-serif;color:#14181d;">
<tr><td style="font-size:20px;font-weight:bold;padding-bottom:12px;">Votre essai se termine le {fin}</td></tr>
<tr><td style="font-size:15px;line-height:1.55;padding-bottom:16px;">
Bonjour,<br><br>
Depuis cinq jours, vous recevez chaque matin les reprises de commerces de votre zone{(" pour " + societe) if societe else ""}.
Pour continuer à les recevoir après le {fin}, il suffit d'ajouter votre carte : l'abonnement démarre au tarif normal, {prix} € par mois, sans engagement.
</td></tr>
<tr><td style="padding:6px 0 22px;"><a href="{link}" style="display:inline-block;background:{TEAL};color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px;font-size:15px;">Continuer à recevoir les reprises</a></td></tr>
<tr><td style="font-size:14px;line-height:1.55;color:#6f6a5c;">
Une question, une zone à ajuster ? Répondez à cet email, ou attendez l'appel de Lawrenza dans les prochains jours.<br><br>
Sans carte au {fin}, les envois s'arrêtent, sans frais et sans rien à faire de votre côté.
</td></tr>
</table></td></tr></table></body></html>"""

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    now = datetime.datetime.now(datetime.timezone.utc)
    subs = sql_exec("select * from subscribers where essai = true and premier_paiement_at is null and essai_rappel_at is null;")
    n = 0
    for s in subs or []:
        if not a_rappeler(s, now):
            continue
        subject = f"Votre essai LeBonProspect se termine le {date_fr(str(s.get('essai_fin'))[:10])}"
        if args.dry_run:
            print(f"DRY: rappel → {s['email']} ({s.get('plan')})")
            n += 1
            continue
        try:
            send_transactional(s["email"], subject, render_rappel(s))
            sql_exec(f"update subscribers set essai_rappel_at = now() where id = {s['id']};")
            print(f"OK: rappel → {s['email']}")
            n += 1
        except Exception as e:
            print(f"ERREUR rappel {s['email']}: {e}", file=sys.stderr)
    print(f"BILAN rappels: {n}")

if __name__ == "__main__":
    main()
