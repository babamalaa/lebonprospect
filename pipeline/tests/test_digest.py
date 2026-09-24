import datetime, pytest
import digest

class FakeDate(datetime.date):
    @classmethod
    def today(cls):
        return cls(2026, 9, 24)

@pytest.fixture(autouse=True)
def freeze_today(monkeypatch):
    monkeypatch.setattr(digest.datetime, "date", FakeDate)

def test_date_fr():
    assert digest.date_fr("2026-09-23") == "23 septembre 2026"

def test_lead_block_complet(fixture):
    leads = fixture("leads.json")
    h = digest.lead_block(leads[0])
    assert "04 00 00 00 00" in h
    assert 'href="tel:0400000000"' in h
    assert "budgets ouverts" in h          # création à J-23
    assert leads[0]["ville"] in h
    assert "Jean Test, Marie Test" in h

def test_lead_block_sans_telephone(fixture):
    h = digest.lead_block(fixture("leads.json")[1])
    assert "bientôt disponible" in h
    assert "en expansion" in h
    assert "établi depuis 2021" in h

def test_lead_block_dirigeants_postgres_et_nom_usage(fixture):
    h = digest.lead_block(fixture("leads.json")[2])
    assert "Nom d'usage" not in h
    assert "Jean Test" in h and "Marie Test" in h   # .title()

def test_lead_block_fallback_commercant(fixture):
    lead = fixture("leads.json")[3]
    assert lead["commercant"] in digest.lead_block(lead)

def test_lead_block_echappe_html():
    h = digest.lead_block({"acheteur_nom": "<script>x</script>", "ville": "A", "departement": "B"})
    assert "<script>" not in h and "&lt;script&gt;" in h

def test_render_digest_regroupe_par_departement(fixture):
    leads = fixture("leads.json")
    h = digest.render_digest("chr", leads, region="Auvergne-Rhône-Alpes", date="2026-09-23")
    assert "5 commerces viennent de changer de mains" in h
    assert h.count("reprise") >= 2
    dept1 = leads[0]["departement"].upper()
    assert f"{dept1} · 2 reprises" in h        # leads 1 et 5 même département
    assert "VAR · 1 reprise\n" in h            # singulier accordé dans l'en-tête de section
    assert 'bgcolor="#ffffff"' in h            # règle mode sombre Apple Mail
    assert "23 septembre 2026" in h

def test_render_digest_singulier():
    """Fige le comportement actuel : le verbe n'est pas accordé au singulier.
    Correction du texte = décision copy, hors périmètre."""
    h = digest.render_digest("chr", [{"acheteur_nom": "X", "ville": "V", "departement": "D"}], date="2026-09-23")
    assert "1 commerce viennent de changer de mains" in h

def test_render_digest_zone_label():
    h = digest.render_digest("tous", [], date="2026-09-23", zone_label="Toulon + 10 km")
    assert "Toulon + 10 km" in h and "tous commerces" in h

def test_render_digest_sans_date_prend_aujourdhui():
    h = digest.render_digest("chr", [])
    assert "24 septembre 2026" in h and "France entière" in h
