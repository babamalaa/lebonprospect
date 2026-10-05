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


def test_lieu_public_mairie_refusee():
    from enrich_places import lieu_public
    assert lieu_public({"displayName": {"text": "Hôtel de Ville de Charleville-Mézières"}})
    assert lieu_public({"displayName": {"text": "Mairie de Rouans"}})
    assert lieu_public({"displayName": {"text": "La Poste"}})
    assert lieu_public({"displayName": {"text": "Centre des Finances publiques"}})

def test_lieu_public_par_type_google():
    from enrich_places import lieu_public
    assert lieu_public({"displayName": {"text": "Accueil"}, "types": ["city_hall"]})
    assert lieu_public({"displayName": {"text": "X"}, "primaryType": "post_office"})

def test_lieu_public_commerces_conserves():
    from enrich_places import lieu_public
    # le mot « poste » ou « mairie » au milieu d'un nom de commerce ne doit pas bloquer
    assert not lieu_public({"displayName": {"text": "Café de la Poste"}, "types": ["cafe"]})
    assert not lieu_public({"displayName": {"text": "Brasserie de la mairie"}, "types": ["restaurant"]})
    assert not lieu_public({"displayName": {"text": "Hôtel bistrot de la Poste"}, "types": ["hotel"]})
    assert not lieu_public(None)


def _row(**kw):
    base = {"acheteur_nom": "", "commercant": "", "vendeur_nom": "", "acheteur_adresse": "", "cp": "", "ville": "", "verticale": "chr"}
    base.update(kw); return base

def _place(nom, adresse, types=("restaurant",), tel="04 74 71 87 64"):
    return {"displayName": {"text": nom}, "formattedAddress": adresse, "nationalPhoneNumber": tel, "types": list(types)}

def test_valider_ji_jo_bon_lieu():
    from enrich_places import valider_lieu
    row = _row(acheteur_nom="JI&JO RESTAURANTS", commercant="Ji&Jo Restaurants, LUMINO", vendeur_nom="LUMINO",
               acheteur_adresse="161 PLACE BERNIGAL GUILLERMIN 69620 VAL D'OINGT", ville="Val-d'Oingt")
    ok, _ = valider_lieu(_place("Ji & Jo restaurants", "161 Pl. Bernigal Guillermin, 69620 Val d'Oingt"), row)
    assert ok

def test_valider_refuse_le_voisin_meme_batiment():
    from enrich_places import valider_lieu
    row = _row(acheteur_nom="JI&JO RESTAURANTS", vendeur_nom="LUMINO", acheteur_adresse="161 PLACE BERNIGAL GUILLERMIN 69620 VAL D'OINGT")
    ok, why = valider_lieu(_place("Frontiera del gusto", "21 Pl. Bernigal Guillermin, 69620 Val d'Oingt"), row)
    assert not ok                      # autre numéro de voie, autre nom : pas le même établissement

def test_valider_refuse_un_garage_pour_un_restaurant():
    from enrich_places import valider_lieu
    row = _row(acheteur_nom="LE FAU (RESTAURANT LE PARC)", acheteur_adresse="51 RUE DES REYMONDS 26220 DIEULEFIT")
    ok, _ = valider_lieu(_place("SARL des Ets Raffy", "Quartier Grds Pres, 26220 Dieulefit", types=("car_repair", "general_contractor")), row)
    assert not ok

def test_valider_refuse_une_concession_pour_un_burger():
    from enrich_places import valider_lieu
    row = _row(acheteur_nom="INTERNATIONAL BURGER'S COMPANY (IBC)", acheteur_adresse="44 ROUTE DE CORBAS 69200 VENISSIEUX")
    ok, why = valider_lieu(_place("Lexus Lyon Sud", "44 Rte de Corbas, 69200 Vénissieux", types=("car_dealer",)), row)
    assert not ok and why == "type de lieu incompatible"

def test_valider_refuse_le_nom_du_vendeur():
    from enrich_places import noms_repreneur
    row = _row(acheteur_nom="JI&JO RESTAURANTS", commercant="Ji&Jo Restaurants, LUMINO", vendeur_nom="LUMINO")
    assert "LUMINO" not in noms_repreneur(row)

def test_mot_de_ville_ne_prouve_rien():
    from enrich_places import valider_lieu
    row = _row(acheteur_nom="COMOB (MOBILAUG DIJON)", acheteur_adresse="23 AVENUE VICTOR HUGO 21000 DIJON", ville="Dijon", verticale="autres")
    ok, _ = valider_lieu(_place("B'CoWorker Dijon", "Le Richelieu, 12 Bd Carnot, 21000 Dijon", types=("coworking_space",)), row)
    assert not ok

def test_alimentaire_refuse_un_fast_food_a_la_meme_adresse():
    from enrich_places import valider_lieu
    row = _row(acheteur_nom="MSE TRADER", acheteur_adresse="320 AVENUE DE LAON 51100 REIMS", ville="Reims", verticale="alimentaire")
    ok, _ = valider_lieu(_place("EAT NIGHT 2", "320 Av. de Laon, 51100 Reims", types=("fast_food_restaurant",)), row)
    assert not ok

def test_autre_commune_refusee():
    from enrich_places import valider_lieu
    row = _row(acheteur_nom="TOP LAVAGE", acheteur_adresse="1 RUE X 02300 VIELS-MAISONS", verticale="garage_auto")
    ok, why = valider_lieu(_place("Top Lavage", "1 Rue Y, 77000 Melun", types=("car_wash",)), row)
    assert not ok and why == "autre commune"
