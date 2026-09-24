import enrich_places as ep

def test_confiance_fixe():
    for t in ["01 23 45 67 89", "0423456789", "05 00 00 00 00", "09 70 00 00 00"]:
        assert ep.confiance(t) == "fixe_etablissement"

def test_confiance_mobile():
    for t in ["06 12 34 56 78", "07 00 00 00 00"]:
        assert ep.confiance(t) == "mobile"

def test_confiance_numero_special_08():
    # 08 n'est pas dans la classe ^0[1-5,9] : classé "mobile" (comportement actuel)
    assert ep.confiance("08 00 00 00 00") == "mobile"

def test_best_query_prefere_vendeur_puis_commercant():
    assert ep.best_query({"vendeur_nom": "LE BISTROT", "ville": "Lyon 3e"}) == "LE BISTROT Lyon 3e"
    assert ep.best_query({"commercant": "LAVERIE X, PARNASSA", "ville": "Marseille, 13005"}) == "LAVERIE X Marseille"

def test_best_query_avec_adresse():
    q = ep.best_query({"vendeur_nom": "LE BISTROT", "ville": "Lyon", "acheteur_adresse": "12 RUE TEST 69003 LYON"})
    assert q == "LE BISTROT 12 RUE TEST 69003 LYON"

def test_best_query_vide():
    # sans nom, la requête est trop courte : main() la saute (len < 8)
    assert len(ep.best_query({"ville": "Lyon"}).strip()) < 8
