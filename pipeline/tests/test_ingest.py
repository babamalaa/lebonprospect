import json, pytest
import ingest

def test_classify_chr():
    assert ingest.classify("56.10A") == "chr"

def test_classify_prefixe_court():
    assert ingest.classify("47.21Z") == "alimentaire"   # préfixe "47.2"

def test_classify_vide_et_inconnu():
    assert ingest.classify("") == "inconnu"
    assert ingest.classify(None) == "inconnu"
    assert ingest.classify("99.99Z") == "autres"

def test_clean_siren():
    assert ingest.clean_siren("123 456 789") == "123456789"
    assert ingest.clean_siren("12345678901234") == "123456789"  # SIRET tronqué
    assert ingest.clean_siren("12345") is None
    assert ingest.clean_siren(None) is None

def test_parse_personnes_dict_et_liste(fixture):
    rows = fixture("bodacc_rows.json")
    assert len(ingest.parse_personnes(rows[0]["listepersonnes"])) == 1
    assert len(ingest.parse_personnes(rows[1]["listepersonnes"])) == 2
    assert ingest.parse_personnes(None) == []
    assert ingest.parse_personnes("{pas du json") == []

def test_flat():
    assert ingest._flat(["CAFE", "DU CENTRE"]) == "CAFE DU CENTRE"
    assert ingest._flat({"a": "X", "b": None}) == "X"
    assert ingest._flat(None) is None

def test_person_summary_personne_physique(fixture):
    rows = fixture("bodacc_rows.json")
    pp = [p for p in ingest.parse_personnes(rows[1]["listepersonnes"]) if p["typePersonne"] == "pp"][0]
    s = ingest.person_summary(pp)
    assert s["denomination"] == "Paul EXEMPLE"  # prénom + nom
    assert s["type"] == "pp"

def test_process_day_sans_reseau(fixture, monkeypatch):
    rows = fixture("bodacc_rows.json")
    cache = fixture("siren_cache.json")
    monkeypatch.setattr(ingest, "fetch_day", lambda day: rows)
    monkeypatch.setattr(ingest, "enrich_siren", lambda siren, c: cache.get(siren))
    out = ingest.process_day("2026-09-23")
    assert len(out) == 4
    r0 = out[0]
    assert r0["acheteur_siren"] == "123456789"
    assert r0["vendeur_siren"] == "987654321"
    assert r0["verticale"] == "chr"
    # ligne 2 : laverie, NAF vendeur 96.01B, acheteur absent du cache
    assert out[1]["verticale"] == "pressing_services"
    assert out[1]["acheteur_info"] is None
    # ligne 3 : aucun SIREN, aucune personne
    assert out[2]["acheteur_siren"] is None and out[2]["vendeur_siren"] is None
    assert out[2]["personnes"] == [] and out[2]["verticale"] == "inconnu"
    # ligne 4 : acte invalide → acte_descriptif None, denomination liste aplatie
    assert out[3]["acte_descriptif"] is None
    assert "CAFE DU CENTRE" in json.dumps(out[3]["personnes"])

def test_process_day_naf_fallback_acheteur(fixture, monkeypatch):
    """Si le NAF vendeur est 00.00Z, on prend celui de l'acheteur."""
    rows = fixture("bodacc_rows.json")
    cache = fixture("siren_cache.json")
    assert cache["444555666"]["naf"] == "00.00Z"          # vendeur de la ligne 4
    monkeypatch.setattr(ingest, "fetch_day", lambda day: [rows[3]])
    monkeypatch.setattr(ingest, "enrich_siren", lambda siren, c: cache.get(siren))
    out = ingest.process_day("2026-09-23")
    assert out[0]["vendeur_siren"] == "444555666"
    assert out[0]["acheteur_siren"] == "111222333"
    assert out[0]["naf_fonds"] == "56.30Z"
    assert out[0]["verticale"] == "chr"

def test_process_day_sans_enrichissement(fixture, monkeypatch):
    monkeypatch.setattr(ingest, "fetch_day", lambda day: fixture("bodacc_rows.json"))
    def interdit(*a, **k):
        raise AssertionError("enrich_siren ne doit pas être appelé")
    monkeypatch.setattr(ingest, "enrich_siren", interdit)
    out = ingest.process_day("2026-09-23", enrich=False)
    assert len(out) == 4 and "verticale" not in out[0]


# --- Correctif du 14 nov. 2026 (ingestion bloquée, envoi de l'essai à 8h37) ---

def test_process_day_ignore_les_annonces_deja_completes(fixture, monkeypatch):
    """Une annonce déjà en base et classée n'est ni ré-enrichie ni renvoyée à load_db."""
    rows = fixture("bodacc_rows.json")
    appels = []
    monkeypatch.setattr(ingest, "fetch_day", lambda day: rows)
    monkeypatch.setattr(ingest, "enrich_siren", lambda siren, c: appels.append(siren))
    deja = {rows[0]["id"], rows[1]["id"]}
    out = ingest.process_day("2026-09-23", deja_complets=deja)
    assert [r["bodacc_id"] for r in out] == [rows[2]["id"], rows[3]["id"]]
    assert "123456789" not in appels and "987654321" not in appels      # SIREN de la ligne 1 jamais interrogés

def test_enrich_siren_respecte_l_echeance(monkeypatch):
    """Passé l'échéance, plus aucun appel réseau, et rien n'est mis en cache (retenté au passage suivant)."""
    def reseau(*a, **k):
        raise AssertionError("aucun appel réseau après l'échéance")
    monkeypatch.setattr(ingest, "http_json", reseau)
    monkeypatch.setitem(ingest.ECHEANCE, "t", 0)                    # échéance déjà passée
    monkeypatch.setitem(ingest.ECHEANCE, "depassee", 0)
    cache = {}
    assert ingest.enrich_siren("123456789", cache) is None
    assert "123456789" not in cache and ingest.ECHEANCE["depassee"] == 1

def test_enrich_siren_appel_court(monkeypatch):
    """Appel à l'annuaire : 10 s maximum et 2 tentatives (au lieu de 30 s et 3)."""
    vu = {}
    def faux(url, retries=3, timeout=30):
        vu.update(retries=retries, timeout=timeout); return {"results": []}
    monkeypatch.setattr(ingest, "http_json", faux)
    monkeypatch.setattr(ingest.time, "sleep", lambda s: None)
    monkeypatch.setitem(ingest.ECHEANCE, "t", None)
    ingest.enrich_siren("999888777", {})
    assert vu == {"retries": 2, "timeout": 10}
