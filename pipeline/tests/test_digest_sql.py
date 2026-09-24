import digest

def capture(monkeypatch):
    seen = {}
    def fake_sql(q):
        seen["q"] = q
        return []
    monkeypatch.setattr(digest, "sql_exec", fake_sql)
    return seen

def test_fetch_leads_verticale_region(monkeypatch):
    seen = capture(monkeypatch)
    digest.fetch_leads("chr", region="Provence-Alpes-Côte d'Azur", date="2026-09-23")
    q = seen["q"]
    assert "verticale = 'chr'" in q
    assert "region = 'Provence-Alpes-Côte d''Azur'" in q     # apostrophe doublée
    assert "date_parution = '2026-09-23'" in q

def test_fetch_leads_tous_sans_filtre_verticale(monkeypatch):
    seen = capture(monkeypatch)
    digest.fetch_leads("tous", villes=["Toulon", "La Seyne-sur-Mer"], departement="Var", date="2026-09-23")
    q = seen["q"]
    assert "verticale =" not in q
    assert "split_part(ville, ',', 1) in ('Toulon','La Seyne-sur-Mer')" in q
    assert "departement = 'Var'" in q

def test_fetch_leads_sans_date_prend_max(monkeypatch):
    seen = capture(monkeypatch)
    digest.fetch_leads("chr")
    assert "select max(date_parution)" in seen["q"]

def test_fetch_leads_ville_avec_apostrophe(monkeypatch):
    seen = capture(monkeypatch)
    digest.fetch_leads("chr", villes=["L'Isle-sur-la-Sorgue"])
    assert "'L''Isle-sur-la-Sorgue'" in seen["q"]

def test_fetch_leads_tri_et_limite(monkeypatch):
    seen = capture(monkeypatch)
    digest.fetch_leads("chr", date="2026-09-23")
    assert "order by (telephone is not null) desc" in seen["q"]
    assert "limit 60" in seen["q"]
