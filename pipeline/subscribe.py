#!/usr/bin/env python3
"""LeBonProspect — gestion des abonnés en ligne de commande.

Ajouter un abonné (après paiement Stripe ou accord) :
  python3 subscribe.py add --email x@y.fr --nom "Jean Dupont" --societe "Agencement Sud" \
      --plan regional --verticales chr --regions "Provence-Alpes-Côte d'Azur"
  python3 subscribe.py add --email x@y.fr --plan departemental --verticales chr --departements "Rhône"
  python3 subscribe.py add --email x@y.fr --plan national --verticales chr

Lister / gérer :
  python3 subscribe.py list
  python3 subscribe.py pause --email x@y.fr
  python3 subscribe.py resume --email x@y.fr
  python3 subscribe.py stop --email x@y.fr        (résilié)

Multi-destinataires enterprise : ajouter plusieurs lignes avec le même societe,
chacune avec son email et son périmètre (ex: 1 commercial = 1 département).
"""
import os, sys, argparse

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from load_db import sql_exec

def esc(s):
    return str(s).replace("'", "''")

def arr(csv_str):
    if not csv_str:
        return "null"
    items = [x.strip() for x in csv_str.split(",") if x.strip()]
    inner = ",".join('"' + i.replace('"', '') + '"' for i in items)
    return "'{" + inner.replace("'", "''") + "}'"

def add(a):
    q = (f"insert into subscribers (email, nom, societe, plan, verticales, departements, regions, statut) "
         f"values ('{esc(a.email.lower())}', "
         f"{'null' if not a.nom else chr(39)+esc(a.nom)+chr(39)}, "
         f"{'null' if not a.societe else chr(39)+esc(a.societe)+chr(39)}, "
         f"'{esc(a.plan)}', {arr(a.verticales)}, {arr(a.departements)}, {arr(a.regions)}, 'actif') "
         f"on conflict (email) do update set plan=excluded.plan, verticales=excluded.verticales, "
         f"departements=excluded.departements, regions=excluded.regions, statut='actif' "
         f"returning id, email, plan;")
    r = sql_exec(q)
    print(f"OK abonné #{r[0]['id']}: {r[0]['email']} ({r[0]['plan']}) — premier digest demain 8h")

def set_statut(email, statut):
    r = sql_exec(f"update subscribers set statut='{statut}' where email='{esc(email.lower())}' returning email;")
    print(f"OK: {email} → {statut}" if r else f"introuvable: {email}")

def list_subs():
    rows = sql_exec("select id, email, societe, plan, verticales, departements, regions, statut, "
                    "dernier_digest, created_at::date as depuis from subscribers order by id;")
    if not rows:
        print("Aucun abonné.")
        return
    for r in rows:
        zone = r.get("regions") or r.get("departements") or "France"
        print(f"#{r['id']:>3} {r['statut']:8s} {r['email']:35s} {r['plan']:13s} "
              f"{str(r.get('verticales'))[:20]:22s} {str(zone)[:30]:32s} dernier: {r.get('dernier_digest') or '-'}")

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    pa = sub.add_parser("add")
    pa.add_argument("--email", required=True)
    pa.add_argument("--nom")
    pa.add_argument("--societe")
    pa.add_argument("--plan", required=True, choices=["departemental", "regional", "national"])
    pa.add_argument("--verticales", default="chr", help="csv: chr,alimentaire,...")
    pa.add_argument("--departements", help="csv de noms exacts: Rhône,Isère")
    pa.add_argument("--regions", help="csv de noms exacts: Occitanie")
    for c in ("pause", "resume", "stop"):
        p = sub.add_parser(c)
        p.add_argument("--email", required=True)
    sub.add_parser("list")
    a = ap.parse_args()
    if a.cmd == "add":
        if a.plan == "departemental" and not a.departements:
            sys.exit("--departements requis pour le plan departemental")
        if a.plan == "regional" and not a.regions:
            sys.exit("--regions requis pour le plan regional")
        add(a)
    elif a.cmd == "list":
        list_subs()
    elif a.cmd == "pause":
        set_statut(a.email, "pause")
    elif a.cmd == "resume":
        set_statut(a.email, "actif")
    elif a.cmd == "stop":
        set_statut(a.email, "resilie")
