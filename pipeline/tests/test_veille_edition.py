from veille_edition import diagnostic


def test_ingeree():
    assert diagnostic(345, 345, 1)[0] == "ok"


def test_publiee_mais_absente_alerte_meme_un_lundi():
    assert diagnostic(200, 0, 0)[0] == "alerte"


def test_ingestion_partielle_alerte():
    assert diagnostic(300, 120, 2)[0] == "alerte"


def test_rien_publie_lundi_ou_samedi_sans_alerte():
    assert diagnostic(0, 0, 0)[0] == "info"
    assert diagnostic(0, 0, 5)[0] == "info"


def test_rien_publie_un_mardi_alerte():
    assert diagnostic(0, 0, 1)[0] == "alerte"
