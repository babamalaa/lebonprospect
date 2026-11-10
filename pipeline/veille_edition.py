#!/usr/bin/env python3
"""Veille de l'édition du jour (décision du 11 nov. 2026) : lancée vers 6h40 (heure de Paris) par Supabase.
1. Ingère l'édition du jour dès qu'elle est publiée (le passage de 7h30 la ré-ingère, l'insertion est idempotente).
2. Avant 7h, vérifie qu'elle est en base. Sinon, alerte par email à Baptiste et Lawrenza, en distinguant :
   - le BODACC a publié mais l'ingestion a échoué (vraie panne : à relancer) ;
   - le BODACC n'a encore rien publié pour aujourd'hui (jour sans parution ou retard du Journal officiel).
   Les lundis et samedis, le BODACC ne paraît presque jamais (1 parution chacun sur les 60 derniers jours au 10 nov. 2026) :
   « rien de publié » ces jours-là est journalisé sans alerte. Une panne d'ingestion alerte tous les jours.
Usage : python3 veille_edition.py [--sans-ingestion] [--date AAAA-MM-JJ] [--dry-run]"""
import argparse, datetime, json, os, subprocess, sys, urllib.parse, urllib.request
from zoneinfo import ZoneInfo

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from load_db import sql_exec

API = "https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records"
DESTINATAIRES = ["baptportugal@gmail.com", "belinlawrenza@gmail.com"]
JOURS_SANS_PARUTION = {0, 5}   # lundi, samedi


def nb_bodacc(jour):
    """Nombre de cessions publiées au BODACC pour ce jour (même filtre que l'ingestion)."""
    w = f'familleavis_lib="Ventes et cessions" AND dateparution=date\'{jour}\''
    url = API + "?" + urllib.parse.urlencode({"where": w, "limit": 0})
    req = urllib.request.Request(url, headers={"Accept-Encoding": "identity", "User-Agent": "lebonprospect-veille"})
    with urllib.request.urlopen(req, timeout=60) as r:
        brut = r.read()
    if brut[:2] == b"\x1f\x8b":            # l'API répond parfois en gzip même sans le demander (constaté le 10 nov. 2026)
        import gzip
        brut = gzip.decompress(brut)
    return int(json.loads(brut.decode())["total_count"])


def nb_base(jour):
    return int(sql_exec(f"select count(*) n from cessions where date_parution = '{jour}';")[0]["n"])


def diagnostic(publie, en_base, jour_semaine):
    """Retourne (niveau, message). niveau : ok | info | alerte. Pure : testée sans réseau."""
    if en_base > 0 and en_base >= publie * 0.95:
        return "ok", f"édition ingérée : {en_base} avis en base sur {publie} publiés"
    if publie > 0:
        return "alerte", (f"le BODACC a publié {publie} avis aujourd'hui mais seulement {en_base} sont en base. "
                          f"L'envoi de 7h30 risque de partir sur l'édition précédente.")
    if jour_semaine in JOURS_SANS_PARUTION:
        return "info", "aucune parution au BODACC (lundi ou samedi, habituel)"
    return "alerte", ("le BODACC n'a encore rien publié pour aujourd'hui (retard du Journal officiel ou jour férié). "
                      "Si rien n'arrive, les abonnés de l'essai recevront le message « pas de parution », les autres rien.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sans-ingestion", action="store_true")
    ap.add_argument("--date")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    maintenant = datetime.datetime.now(ZoneInfo("Europe/Paris"))
    jour = a.date or maintenant.date().isoformat()
    if not a.sans_ingestion:
        from ingest import process_day, save_day
        recs = process_day(jour, enrich=True, cache={})
        save_day(jour, recs)
        rr = subprocess.run([sys.executable, "load_db.py"], capture_output=True, text=True, cwd=HERE)
        print(f"ingestion {jour} : {len(recs)} avis récupérés, chargement {'OK' if rr.returncode == 0 else 'ÉCHEC'}")
    publie, en_base = nb_bodacc(jour), nb_base(jour)
    niveau, msg = diagnostic(publie, en_base, datetime.date.fromisoformat(jour).weekday())
    print(f"{maintenant:%H:%M} {niveau} : {msg}")
    try:
        from cron_github import journal
        journal("veille_edition", niveau != "alerte", nb=publie, nb_ok=en_base, erreur=msg if niveau == "alerte" else None,
                detail={"jour": jour, "niveau": niveau, "heure": f"{maintenant:%H:%M}"})
    except Exception as e:
        print("journal non enregistré :", e)
    if niveau == "alerte" and not a.dry_run:
        from digest import send_resend
        texte = (f"<p>À {maintenant:%Hh%M}, l'édition du {jour} n'est pas en base : {msg}</p>"
                 f"<p>Publiés au BODACC : <b>{publie}</b> · en base : <b>{en_base}</b></p>"
                 f"<p>Relancer : <code>gh workflow run cron-daily.yml</code> ou "
                 f"<a href=\"https://github.com/babamalaa/lebonprospect/actions\">GitHub Actions</a>. "
                 f"Tableau de santé : onglet Santé de l'admin.</p>")
        for d in DESTINATAIRES:
            send_resend(d, f"[ALERTE] Édition du {jour} non ingérée à {maintenant:%Hh%M}", texte)
    return 0


if __name__ == "__main__":
    sys.exit(main())
