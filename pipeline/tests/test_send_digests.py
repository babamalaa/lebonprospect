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
