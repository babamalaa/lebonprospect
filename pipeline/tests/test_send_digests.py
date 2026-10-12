import datetime
import send_digests as sd

def test_as_list():
    assert sd._as_list(None) == []
    assert sd._as_list(["a"]) == ["a"]
    assert sd._as_list("{chr,alimentaire}") == ["chr", "alimentaire"]
    assert sd._as_list('{"Toulon","La Seyne-sur-Mer"}') == ["Toulon", "La Seyne-sur-Mer"]

def test_plan_regional(fixture):
    v, r, d, vi, zone = sd.plan_for_subscriber(fixture("subscribers.json")[0])
    assert v == ["chr"] and r == ["Occitanie"] and zone == "Occitanie"

def test_plan_departemental_multi_str_postgres(fixture):
    v, r, d, vi, zone = sd.plan_for_subscriber(fixture("subscribers.json")[2])
    assert v == ["chr", "alimentaire"] and d == ["Rhône", "Isère"] and zone == "Rhône, Isère"

def test_plan_zone_sur_mesure(fixture):
    v, r, d, vi, zone = sd.plan_for_subscriber(fixture("subscribers.json")[3])
    assert vi == ["Toulon", "La Seyne-sur-Mer"] and zone == "Toulon + 10 km" and v == ["tous"]

def test_plan_villes_sans_zone_label():
    *_, zone = sd.plan_for_subscriber({"villes": ["Toulon", "Hyères"]})
    assert zone == "Toulon et alentours"

def test_plan_national(fixture):
    *_, zone = sd.plan_for_subscriber(fixture("subscribers.json")[4])
    assert zone == "France entière"

def test_plan_verticale_par_defaut():
    v, *_ = sd.plan_for_subscriber({"email": "x@y.fr"})
    assert v == ["chr"]

def test_plan_verticales_tableau_postgres_vide():
    """Comme avant le refactor : '{}' donne aucune verticale, pas le défaut chr."""
    v, *_ = sd.plan_for_subscriber({"verticales": "{}"})
    assert v == []

def test_main_dry_run_saute_deja_servi(fixture, monkeypatch, capsys):
    subs = fixture("subscribers.json")
    calls, fetched = [], []
    def fake_sql(q):
        if "from subscribers" in q: return subs
        if "max(date_parution)" in q: return [{"d": "2026-09-23"}]
        calls.append(q); return []
    def fake_fetch(*a, **k):
        fetched.append((a, k))
        return [{"acheteur_nom": "X", "ville": "V", "departement": "D"}]
    monkeypatch.setattr(sd, "sql_exec", fake_sql)
    monkeypatch.setattr(sd, "fetch_leads", fake_fetch)
    monkeypatch.setattr(sd, "send_resend", lambda *a, **k: (_ for _ in ()).throw(AssertionError("envoi interdit en dry-run")))
    monkeypatch.setattr("sys.argv", ["send_digests.py", "--dry-run"])
    class FD(datetime.date):
        @classmethod
        def today(cls): return cls(2026, 9, 24)
    monkeypatch.setattr(sd.datetime, "date", FD)
    sd.main()
    out = capsys.readouterr().out
    assert out.count("DRY:") == 4          # 5 abonnés moins le déjà servi
    assert "deja-servi@example.com" not in out
    assert "1 déjà servis" in out          # abonné 2, dernier_digest = 2026-09-24
    assert calls == []                      # aucun insert/update en dry-run
    # abonné 3 : 2 verticales x 2 départements ; abonné 4 : villes dans le Var
    assert ((("chr",), {"departement": "Isère", "date": "2026-09-23"})) in fetched
    assert (("tous",), {"departement": "Var", "date": "2026-09-23",
                        "villes": ["Toulon", "La Seyne-sur-Mer"]}) in fetched
    assert "Toulon + 10 km" in out


def test_rectificatif_deja_vu_est_retire():
    import send_digests as sd
    leads = [{"id": 1, "type_avis": "Avis initial", "acheteur_siren": "111"},
             {"id": 2, "type_avis": "Avis rectificatif", "acheteur_siren": "111"},   # reprise déjà envoyée
             {"id": 3, "type_avis": "Avis rectificatif", "acheteur_siren": "222"}]   # rectificatif d'une reprise jamais envoyée : on garde
    out = sd.sans_rectificatifs_deja_vus(leads, {"111"})
    assert [r["id"] for r in out] == [1, 3]

def test_rectificatif_sans_historique_conserve():
    import send_digests as sd
    leads = [{"id": 1, "type_avis": "Avis rectificatif", "acheteur_siren": "111"}]
    assert sd.sans_rectificatifs_deja_vus(leads, set()) == leads


def test_dans_la_zone_ecarte_un_repreneur_hors_zone(monkeypatch):
    import send_digests as sd
    monkeypatch.setattr(sd, "_code_dept", lambda d: {"Côte-d'Or": "21", "Saône-et-Loire": "71"}.get(d))
    veni = {"id": 1, "acheteur_adresse": "44 ROUTE DE CORBAS 69200 VENISSIEUX", "cp": "69200"}                   # Vénissieux (69) : hors zone
    dijon = {"id": 2, "acheteur_adresse": "3 RUE X 21000 DIJON", "cp": "21000"}                                   # Dijon (21) : dans la zone
    mixte = {"id": 3, "acheteur_adresse": "7 RUE Y 75016 PARIS", "cp": "75016, 71000", "fonds_cp": "71000"}       # repreneur à Paris, fonds à Mâcon (adresse du fonds connue) : on garde
    sans_cp = {"id": 4, "acheteur_adresse": None, "cp": None}                                                     # pas de preuve d'erreur : on garde
    out = sd.dans_la_zone([veni, dijon, mixte, sans_cp], ["Côte-d'Or", "Saône-et-Loire"])
    assert [r["id"] for r in out] == [2, 3, 4]


def test_numeros_non_verifies_sont_masques():
    import send_digests as sd
    leads = [{"id": 1, "telephone": "04 00 00 00 01", "tel_validation": "nom du repreneur"},      # validé : conservé
             {"id": 2, "telephone": "04 00 00 00 02", "tel_validation": None},                     # jamais vérifié : masqué
             {"id": 3, "telephone": "04 00 00 00 03", "tel_validation": "rejete : autre commune"}, # rejeté : masqué
             {"id": 4, "telephone": None, "tel_validation": None}]
    out = sd.numeros_verifies(leads)
    assert [r["telephone"] for r in out] == ["04 00 00 00 01", None, None, None]


def test_digest_classique_masque_aussi_les_numeros_non_verifies(monkeypatch):
    import send_digests as sd
    leads = [{"id": 1, "telephone": "04 75 46 45 73", "tel_validation": None}]
    monkeypatch.setattr(sd, "sql_exec", lambda q: [])
    # numeros_verifies est appelé sur tous les chemins : on vérifie ici sa garantie de base
    assert sd.numeros_verifies(leads)[0]["telephone"] is None


def test_sql_exec_reessaye_une_erreur_500(monkeypatch):
    import io, urllib.error, load_db
    monkeypatch.setattr(load_db, "env", lambda k: "x")
    monkeypatch.setattr("time.sleep", lambda s: None)
    appels = {"n": 0}
    class Rep:
        def __enter__(self): return self
        def __exit__(self, *a): pass
        def read(self): return b'[{"ok": 1}]'
    def faux_urlopen(req, timeout=0):
        appels["n"] += 1
        if appels["n"] < 3:
            raise urllib.error.HTTPError("u", 500, "Internal Server Error", {}, io.BytesIO(b""))
        return Rep()
    monkeypatch.setattr(load_db.urllib.request, "urlopen", faux_urlopen)
    assert load_db.sql_exec("select 1") == [{"ok": 1}]
    assert appels["n"] == 3                       # deux échecs, puis réussite

def test_sql_exec_ne_reessaye_pas_une_requete_invalide(monkeypatch):
    import io, urllib.error, load_db
    monkeypatch.setattr(load_db, "env", lambda k: "x")
    monkeypatch.setattr("time.sleep", lambda s: None)
    appels = {"n": 0}
    def faux_urlopen(req, timeout=0):
        appels["n"] += 1
        raise urllib.error.HTTPError("u", 400, "Bad Request", {}, io.BytesIO(b""))
    monkeypatch.setattr(load_db.urllib.request, "urlopen", faux_urlopen)
    import pytest
    with pytest.raises(urllib.error.HTTPError):
        load_db.sql_exec("select bad")
    assert appels["n"] == 1                       # une requête fausse n'est pas rejouée


# ---------------------------------------------------------------------------------------------------------------------------
# Envois de l'essai : cas réels des 10, 11 et 12 octobre 2026
# ---------------------------------------------------------------------------------------------------------------------------
def _essai(monkeypatch, today, last_ed, deja=(), jour_deja=()):
    """Simule handle_test_subscriber en dry-run ; renvoie la liste des types qui partiraient."""
    import send_digests as sd
    sub = {"id": 10, "email": "a@x.fr", "nom": "Alexandre Benamar", "departements": ["Marne"], "verticales": ["commerces"], "suivi_test": True}
    lead = {"id": 1, "acheteur_nom": "X", "acheteur_siren": "111", "vendeur_nom": "V", "departement": "Marne", "ville": "Reims",
            "date_parution": str(last_ed), "telephone": None, "tel_validation": None, "acheteur_adresse": "1 rue A 51100 REIMS"}
    def fake_sql(q):
        if "from digests_log where subscriber_id" in q and "date_digest" in q: return [{"type": t} for t in jour_deja]
        if "from digests_log where subscriber_id" in q: return [{"type": t, "edition": e} for t, e in deja]
        if "from subscribers where suivi_test" in q: return [{"id": 10}]
        return []
    monkeypatch.setattr(sd, "sql_exec", fake_sql)
    monkeypatch.setattr(sd, "fetch_range", lambda *a, **k: [dict(lead)])
    monkeypatch.setattr(sd, "plan_for_subscriber", lambda s: (["commerces"], [], ["Marne"], [], "Marne (51)"))
    monkeypatch.setattr(sd, "dans_la_zone", lambda leads, depts: leads)
    monkeypatch.setattr(sd, "deja_envoyes", lambda ids: set())
    vus = []
    monkeypatch.setattr("builtins.print", lambda *a, **k: vus.append(" ".join(str(x) for x in a)))
    sd.handle_test_subscriber(sub, last_ed, today, True)
    return [l.split("[")[1].split("]")[0] for l in vus if l.startswith("DRY[")]

def test_samedi_sans_edition_envoie_un_message(monkeypatch):
    # sam. 10 oct. : dernière édition = 9, déjà servie -> avant : rien. Maintenant : « relache ».
    assert _essai(monkeypatch, "2026-10-10", "2026-10-09", deja=[("bienvenue", "2026-10-04"), ("quotidien", "2026-10-09")]) == ["relache"]

def test_lundi_sans_edition_envoie_relache_et_recap(monkeypatch):
    # lun. 12 oct. : dernière édition = 11, déjà servie -> avant : rien du tout. Maintenant : « relache » + récap.
    assert _essai(monkeypatch, "2026-10-12", "2026-10-11", deja=[("bienvenue", "2026-10-04"), ("quotidien", "2026-10-11")]) == ["relache", "hebdo"]

def test_jour_avec_edition_envoie_le_quotidien(monkeypatch):
    assert _essai(monkeypatch, "2026-10-11", "2026-10-11", deja=[("bienvenue", "2026-10-04"), ("quotidien", "2026-10-09")]) == ["quotidien"]

def test_pas_de_second_envoi_le_meme_jour(monkeypatch):
    # second déclenchement de 8h05 : rien ne repart
    assert _essai(monkeypatch, "2026-10-13", "2026-10-13", deja=[("bienvenue", "2026-10-04"), ("quotidien", "2026-10-13")], jour_deja=["quotidien"]) == []

def test_recap_du_lundi_pas_renvoye(monkeypatch):
    assert _essai(monkeypatch, "2026-10-12", "2026-10-11", deja=[("bienvenue", "2026-10-04"), ("quotidien", "2026-10-11")], jour_deja=["relache", "hebdo"]) == []

def test_doublon_do_it_supprime():
    import send_digests as sd
    a = {"id": 656955, "acheteur_nom": "DO IT", "acheteur_siren": "103239356", "vendeur_nom": "ADULIE", "date_parution": "2026-10-09"}
    b = {**a, "id": 657031}
    autre = {"id": 3, "acheteur_nom": "AUTRE", "acheteur_siren": "222", "vendeur_nom": "Z", "date_parution": "2026-10-09"}
    assert [r["id"] for r in sd.sans_doublons([a, b, autre])].count(656955) + [r["id"] for r in sd.sans_doublons([a, b, autre])].count(657031) == 1
    assert len(sd.sans_doublons([a, b, autre])) == 2

def test_meme_repreneur_deux_fonds_differents_garde_les_deux():
    import send_digests as sd
    a = {"id": 1, "acheteur_nom": "SAS X", "acheteur_siren": "333", "vendeur_nom": "Boulangerie A", "date_parution": "2026-10-09"}
    b = {"id": 2, "acheteur_nom": "SAS X", "acheteur_siren": "333", "vendeur_nom": "Boulangerie B", "date_parution": "2026-10-09"}
    assert len(sd.sans_doublons([a, b])) == 2         # deux fonds achetés par la même société : deux reprises réelles


# --- zone : l'adresse du FONDS (listeetablissements) tranche (12 oct. 2026) ---
def _zone(monkeypatch, leads, depts):
    import send_digests as sd
    monkeypatch.setattr(sd, "_code_dept", lambda d: {"Marne": "51", "Côte-d'Or": "21", "Saône-et-Loire": "71"}.get(d))
    return [r["id"] for r in sd.dans_la_zone(leads, depts)]

def test_zone_do_it_laverie_a_reims_gardee(monkeypatch):
    # siège à Saint-Nicolas (62), laverie à Reims (51) : c'est un commerce de la Marne
    do_it = {"id": 1, "acheteur_adresse": "114 PLACE DU MARCHE 62223 SAINT-NICOLAS", "cp": "62223, 51100",
             "fonds_adresse": "13 Esplanade Flechambault 51100 Reims", "fonds_cp": "51100"}
    assert _zone(monkeypatch, [do_it], ["Marne"]) == [1]

def test_zone_siege_dans_la_zone_mais_fonds_ailleurs_ecarte(monkeypatch):
    # repreneur à Dijon qui rachète un commerce à Lyon : pas pour Raphaël
    r = {"id": 2, "acheteur_adresse": "3 RUE X 21000 DIJON", "cp": "21000, 69003", "fonds_adresse": "5 rue Y 69003 Lyon", "fonds_cp": "69003"}
    assert _zone(monkeypatch, [r], ["Côte-d'Or"]) == []

def test_zone_repreneur_parisien_fonds_a_macon_garde(monkeypatch):
    r = {"id": 3, "acheteur_adresse": "7 RUE Y 75016 PARIS", "cp": "75016, 71000", "fonds_adresse": "2 place Z 71000 Mâcon", "fonds_cp": "71000"}
    assert _zone(monkeypatch, [r], ["Saône-et-Loire"]) == [3]

def test_zone_sans_adresse_de_fonds_google_confirme(monkeypatch):
    # option B : pas d'adresse de fonds, siège hors zone, mais Google a validé l'établissement dans la zone
    r = {"id": 4, "acheteur_adresse": "7 RUE Y 75016 PARIS", "cp": "75016, 71000",
         "place_adresse": "2 Pl. Z, 71000 Mâcon", "tel_validation": "nom du repreneur"}
    assert _zone(monkeypatch, [r], ["Saône-et-Loire"]) == [4]

def test_zone_sans_adresse_de_fonds_siege_et_google_hors_zone_ecarte(monkeypatch):
    r = {"id": 5, "acheteur_adresse": "31 RUE MARBEUF 75008 PARIS", "cp": "75008, 51100"}
    assert _zone(monkeypatch, [r], ["Marne"]) == []
