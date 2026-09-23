#!/usr/bin/env python3
"""LeBonProspect — veille Stripe : alerte dès qu'un abonnement bouge.

Conçu pour tourner en watchdog (cron no_agent) : n'écrit RIEN sur stdout quand il n'y
a aucune nouveauté, donc aucune notification. Dès qu'un événement survient, il imprime
le message à envoyer tel quel.

Événements suivis :
  - nouvel abonnement (essai gratuit ou paiement direct)
  - essai converti (premier encaissement réel)
  - abonnement résilié / essai abandonné
  - incohérence : abonnement Stripe sans ligne dans subscribers (webhook en échec)

État conservé dans ~/.hermes/state/lbp_stripe_watch.json
"""
import json, os, sys, base64, urllib.request, urllib.error, datetime

ENVFILE = os.path.expanduser("~/.repreneur-env")
STATE = os.path.expanduser("~/.hermes/state/lbp_stripe_watch.json")


def env(key):
    """Lit une clé dans ~/.repreneur-env, tolère 'KEY=v' comme 'export KEY="v"'."""
    if os.environ.get(key):
        return os.environ[key]
    if os.path.exists(ENVFILE):
        for line in open(ENVFILE):
            line = line.strip()
            if line.startswith("export "):
                line = line[7:]
            if line.startswith(key + "="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit(f"Clé manquante : {key}")


def stripe(path):
    req = urllib.request.Request("https://api.stripe.com/v1" + path)
    req.add_header("Authorization", "Basic " + base64.b64encode((env("STRIPE_SECRET_KEY") + ":").encode()).decode())
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def sql(query):
    ref, token = env("SUPABASE_PROJECT_REF"), env("SUPABASE_TOKEN")
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{ref}/database/query",
        data=json.dumps({"query": query}).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json",
                 "User-Agent": "lebonprospect-watch/1.0"},
        method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode())


def jour(ts):
    return datetime.datetime.fromtimestamp(ts).strftime("%d/%m") if ts else "?"


def main():
    try:
        subs = stripe("/subscriptions?limit=100&status=all")["data"]
    except urllib.error.HTTPError as e:
        print(f"Veille Stripe en échec : HTTP {e.code}. La clé API ou ses permissions sont à vérifier.")
        return

    os.makedirs(os.path.dirname(STATE), exist_ok=True)
    known = {}
    if os.path.exists(STATE):
        try:
            known = json.load(open(STATE))
        except Exception:
            known = {}

    # abonnés connus en base, pour détecter un webhook qui n'aurait pas tourné
    try:
        rows = sql("select stripe_subscription_id from subscribers where stripe_subscription_id is not null;")
        en_base = {r["stripe_subscription_id"] for r in rows}
    except Exception:
        en_base = None

    alertes, etat = [], {}
    for s in subs:
        sid = s["id"]
        statut = s["status"]
        etat[sid] = statut
        meta = s.get("metadata") or {}
        plan_key = meta.get("plan") or ""
        plan = {"departemental": "Départemental 149 €", "regional": "Régional 299 €"}.get(plan_key, plan_key or "plan inconnu")
        essai = meta.get("essai") == "7j"

        client = ""
        try:
            c = stripe(f"/customers/{s['customer']}")
            client = c.get("email") or c.get("name") or s["customer"]
        except Exception:
            client = s["customer"]

        avant = known.get(sid)

        if avant is None:
            if statut == "trialing":
                alertes.append(
                    f"ESSAI DÉMARRÉ : {client}\n"
                    f"{plan} · essai gratuit jusqu'au {jour(s.get('trial_end'))}\n"
                    f"Premier digest demain 8h. Premier prélèvement le {jour(s.get('trial_end'))} sauf résiliation."
                )
            elif statut == "active":
                alertes.append(f"NOUVEL ABONNÉ PAYANT : {client}\n{plan} · encaissement confirmé.")
            else:
                alertes.append(f"Nouvel abonnement {statut} : {client} · {plan}")
        elif avant != statut:
            if avant == "trialing" and statut == "active":
                alertes.append(f"ESSAI CONVERTI : {client}\n{plan} · premier paiement encaissé.")
            elif statut in ("canceled", "incomplete_expired"):
                quoi = "Essai abandonné" if avant == "trialing" else "Abonnement résilié"
                alertes.append(f"{quoi} : {client} · {plan}")
            elif statut == "past_due":
                alertes.append(f"Paiement en échec : {client} · {plan}. Carte à renouveler.")
            else:
                alertes.append(f"Changement de statut : {client} · {avant} vers {statut}")

        if en_base is not None and statut in ("trialing", "active") and sid not in en_base:
            alertes.append(
                f"À VÉRIFIER : {client} est abonné dans Stripe mais absent de la base. "
                f"Le webhook n'a pas tourné, il ne recevra pas son digest."
            )

    json.dump(etat, open(STATE, "w"))

    if alertes:
        print("LeBonProspect · " + datetime.datetime.now().strftime("%d/%m %H:%M"))
        print()
        print("\n\n".join(alertes))
        print()
        print("Suivi complet : https://www.lebonprospect.fr/closers/app")


if __name__ == "__main__":
    main()
