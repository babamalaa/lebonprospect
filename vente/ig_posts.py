# Contenu des 6 posts Instagram LeBonProspect (compte marque). Chiffres réels, base au 20/09/2026.
from ig_render import slide

T = 6  # helper pour les totaux de carrousel

# ---------- POST 1 : carrousel "Il vient de racheter un commerce" (le mécanisme, orienté résultat) ----------
p1 = [
    slide('''<div class="eyebrow">Chaque matin en France</div>
<h1>Quelqu'un vient de racheter un commerce <span class="hl">près de chez vous.</span></h1>
<p class="lead">Il refait tout dans les 90 jours. Enseigne, matériel, caisse, contrats. Et il n'a encore aucun fournisseur attitré.</p>''', n=1, total=6, tag="Comment ça marche"),
    slide('''<div class="eyebrow">Lundi · jour J</div>
<h1 class="md">Le rachat est signé chez le notaire.</h1>
<p class="lead">Un restaurateur reprend « Le Petit Zinc » à Lyon. La cession est publiée au Journal officiel : c'est une obligation légale, personne n'y échappe.</p>''', n=2, total=6, tag="Comment ça marche"),
    slide('''<div class="eyebrow">Mardi · 8h00</div>
<h1 class="md">Son nom est dans votre boîte mail.</h1>
<p class="lead">Sur les 89 pages de jargon juridique publiées ce matin-là, 3 reprises concernent votre métier et votre zone. On les a trouvées, identifiées, enrichies.</p>
<div style="margin-top:44px"><span class="phone">04 72 13 ██ ██</span></div>''', "dark", n=3, total=6, tag="Comment ça marche"),
    slide('''<div class="eyebrow">Mardi · 9h15</div>
<h1 class="md">Vous êtes le premier à appeler.</h1>
<p class="lead">« Félicitations pour la reprise ! » Le repreneur a mille choses à acheter et zéro fournisseur attitré. Le premier qui appelle prend une longueur d'avance.</p>''', n=4, total=6, tag="Comment ça marche"),
    slide('''<div class="eyebrow">Pour qui</div>
<h1 class="sm">Tous ceux qui vendent aux restaurants, bars et hôtels.</h1>
<div class="list">
<div class="item"><div class="n">01</div><div><b>Agenceurs</b><span>salle, comptoir, terrasse</span></div></div>
<div class="item"><div class="n">02</div><div><b>Équipementiers de cuisine</b><span>froid, cuisson, laverie, inox</span></div></div>
<div class="item"><div class="n">03</div><div><b>Caisse et encaissement</b><span>logiciel, TPE, bornes</span></div></div>
<div class="item"><div class="n">04</div><div><b>Enseignistes</b><span>enseigne, vitrine, signalétique</span></div></div>
<div class="item"><div class="n">05</div><div><b>Brasseurs, boissons, assurance pro</b><span>contrats à renégocier à chaque reprise</span></div></div>
</div>''', n=5, total=6, tag="Comment ça marche"),
    slide('''<div class="eyebrow">LeBonProspect</div>
<h1 class="md">Un email. Des reprises. Des numéros.</h1>
<p class="lead">Chaque matin à 8h, les commerces de votre métier et de votre zone qui viennent de changer de propriétaire, avec le nom du repreneur et le téléphone de l'établissement.</p>
<div class="cta">Voir les reprises de ma zone</div><div class="url">lebonprospect.fr</div>''', "teal", n=6, total=6, tag="Comment ça marche"),
]

# ---------- POST 2 : image unique, le chiffre choc ----------
p2 = [
    slide('''<div class="eyebrow">Journal officiel · 12 derniers mois</div>
<div class="big">47 305</div>
<h1 class="sm" style="margin-top:26px">commerces ont changé de propriétaire en France.</h1>
<p class="lead">Soit 3 942 par mois. Chacun est un nouveau patron qui rééquipe, renégocie et cherche ses fournisseurs. Combien vous en ont appelé ?</p>
<div class="url">lebonprospect.fr</div>''', tag="Source : BODACC, cessions de fonds de commerce"),
]

# ---------- POST 3 : carrousel "Oui, c'est public. Ce n'est pas ce que vous achetez." ----------
p3 = [
    slide('''<div class="eyebrow">L'objection qu'on entend tous les jours</div>
<h1>« C'est public, je peux le faire <span class="hl">moi-même.</span> »</h1>
<p class="lead">Vous avez raison. Voici ce que ça demande, tous les matins.</p>''', n=1, total=5, tag="Public vs exploitable"),
    slide('''<div class="eyebrow">Ce que le BODACC contient</div>
<h1 class="sm">89 pages par jour. Tous secteurs. Toute la France.</h1>
<div class="list">
<div class="item"><div class="n">×</div><div><b>Aucun tri par métier</b><span>restaurants, garages et pharmacies mélangés</span></div></div>
<div class="item"><div class="n">×</div><div><b>Aucun téléphone</b><span>une raison sociale et une adresse, c'est tout</span></div></div>
<div class="item"><div class="n">×</div><div><b>Aucun nom de dirigeant</b><span>vous appelez qui ?</span></div></div>
<div class="item"><div class="n">×</div><div><b>Aucun signal de fraîcheur</b><span>repreneur tout juste installé, ou déjà en activité ?</span></div></div>
</div>''', "dark", n=2, total=5, tag="Public vs exploitable"),
    slide('''<div class="eyebrow">Ce que vous recevez à 8h</div>
<h1 class="sm">3 reprises. Votre métier. Votre zone. Prêtes à appeler.</h1>
<div class="list">
<div class="item"><div class="n">✓</div><div><b>Le repreneur identifié</b><span>nom, société, adresse de l'établissement</span></div></div>
<div class="item"><div class="n">✓</div><div><b>Le numéro de téléphone</b><span>82 % des fiches CHR livrées avec le numéro</span></div></div>
<div class="item"><div class="n">✓</div><div><b>Le badge « budgets ouverts »</b><span>repreneur installé depuis moins de 90 jours</span></div></div>
<div class="item"><div class="n">✓</div><div><b>Le lendemain de la publication</b><span>pas à J+30, quand le concurrent est déjà passé</span></div></div>
</div>''', n=3, total=5, tag="Public vs exploitable"),
    slide('''<div class="eyebrow">Le vrai sujet</div>
<div class="quote">Public, oui.<br>Exploitable, non.<br><br>La question n'est pas l'accès. C'est qui les lit tous les matins à votre place, et à quelle vitesse vous décrochez.</div>''', "teal", n=4, total=5, tag="Public vs exploitable"),
    slide('''<div class="eyebrow">Le calcul</div>
<h1 class="md">Un client signé rembourse un an d'abonnement.</h1>
<p class="lead">149 € par mois pour un département, 1 788 € par an. Un chantier chez un agenceur, un équipementier ou un enseigniste vaut plus que ça. Il n'y a pas d'autre calcul à faire.</p>
<div class="cta">Tester un mois, sans engagement</div><div class="url">lebonprospect.fr</div>''', n=5, total=5, tag="Public vs exploitable"),
]

# ---------- POST 4 : image unique, "Les dernières, en vrai" (feed réel, masqué) ----------
p4 = [
    slide('''<div class="eyebrow">Publiées au Journal officiel · restaurants, bars et hôtels</div>
<h1 class="sm">Ce que nos abonnés ont reçu ce matin.</h1>
<div style="margin-top:36px">
<div class="row"><div class="date">20/09<br>Paris 5e</div><div class="what"><b>Le Piano Vache</b> reprend un bar rue Laplace <span class="badge">budgets ouverts</span><div class="meta">Repreneur identifié · ☎ 01 46 33 ██ ██</div></div></div>
<div class="row"><div class="date">20/09<br>Bordeaux</div><div class="what"><b>Dolce Vita</b> reprend un restaurant rue du Pas Saint-Georges <span class="badge">en expansion</span><div class="meta">Repreneur identifié · ☎ 06 46 68 ██ ██</div></div></div>
<div class="row"><div class="date">20/09<br>Ploërmel</div><div class="what"><b>La Halte Celtique</b> reprend un fonds rue des Primevères <span class="badge">budgets ouverts</span><div class="meta">Repreneur identifié · ☎ 06 41 88 ██ ██</div></div></div>
<div class="row"><div class="date">20/09<br>Annecy</div><div class="what"><b>████████</b> reprend un restaurant place des Rhododendrons<div class="meta">Détails réservés aux abonnés</div></div></div>
</div>
<p class="lead" style="font-size:26px;margin-top:30px">48 reprises CHR publiées le même jour partout en France. Chaque ligne est vérifiable au BODACC, gratuitement, pour toujours.</p>''', tag="Numéros masqués · données réelles"),
]

# ---------- POST 5 : carrousel "Pourquoi le repreneur, pas le créateur" ----------
p5 = [
    slide('''<div class="eyebrow">Une idée reçue</div>
<h1>Le meilleur prospect n'est pas celui qui <span class="hl">crée</span> un commerce.</h1>
<p class="lead">C'est celui qui en reprend un. Voici pourquoi.</p>''', n=1, total=5, tag="Repreneur vs créateur"),
    slide('''<div class="eyebrow">01</div>
<h1 class="md">Son financement est validé.</h1>
<p class="lead">Pour racheter un fonds, il a convaincu une banque. Ce n'est pas un projet sur papier, c'est un budget disponible, tout de suite.</p>''', n=2, total=5, tag="Repreneur vs créateur"),
    slide('''<div class="eyebrow">02</div>
<h1 class="md">Il achète maintenant, pas dans un an.</h1>
<p class="lead">L'enseigne encore au nom de l'ancien, la mise aux normes, le matériel qui lâche. Un repreneur découvre ce qu'il doit changer une fois dedans, et il le change dans les 90 jours.</p>''', "dark", n=3, total=5, tag="Repreneur vs créateur"),
    slide('''<div class="eyebrow">03</div>
<h1 class="md">Il n'a pas encore de fournisseur attitré.</h1>
<p class="lead">Les contrats de l'ancien propriétaire ne sont pas les siens. Boissons, assurance, caisse, maintenance : tout est ouvert. La seule question, c'est qui l'appelle en premier.</p>''', n=4, total=5, tag="Repreneur vs créateur"),
    slide('''<div class="eyebrow">Île-de-France · Auvergne-Rhône-Alpes · PACA</div>
<h1 class="sm">Sur 90 jours, rien que pour les restaurants, bars et hôtels :</h1>
<div class="grid2" style="grid-template-columns:1fr;gap:30px">
<div class="stat" style="flex-direction:row;align-items:baseline;gap:28px"><div class="n" style="font-size:118px;min-width:300px">519</div><div class="l" style="font-size:30px">reprises en Île-de-France</div></div>
<div class="stat" style="flex-direction:row;align-items:baseline;gap:28px"><div class="n" style="font-size:118px;min-width:300px">357</div><div class="l" style="font-size:30px">en Auvergne-Rhône-Alpes</div></div>
<div class="stat" style="flex-direction:row;align-items:baseline;gap:28px"><div class="n" style="font-size:118px;min-width:300px">356</div><div class="l" style="font-size:30px">en Provence-Alpes-Côte d'Azur</div></div>
</div>
<div class="url">lebonprospect.fr/reprises</div>''', "teal", n=5, total=5, tag="Source : BODACC, 90 derniers jours"),
]

# ---------- POST 6 : carrousel "Faire soi-même vs LeBonProspect" (comparatif) ----------
p6 = [
    slide('''<div class="eyebrow">Deux façons de faire</div>
<h1>Le stock, ou <span class="hl">le signal.</span></h1>
<p class="lead">Vous avez peut-être déjà un fichier de tous les restaurants de votre zone. Ce n'est pas la même chose.</p>''', n=1, total=4, tag="Stock vs signal"),
    slide('''<div class="eyebrow">Comparatif</div>
<h1 class="sm">Le stock contre le signal.</h1>
<div class="vs">
<div class="col a"><h3>Le stock</h3><ul><li>Tous les restaurants de la zone</li><li>En permanence, sans changement</li><li>Impossible à appeler en entier</li><li>Ils ont déjà leurs fournisseurs</li><li>Vous arrivez après tout le monde</li></ul></div>
<div class="col b"><h3>Le signal</h3><ul><li>Ceux qui ont changé de propriétaire hier</li><li>3 à 5 par jour, dans votre métier</li><li>Les seuls à appeler cette semaine</li><li>Aucun fournisseur attitré</li><li>Vous arrivez le premier</li></ul></div>
</div>''', n=2, total=4, tag="Stock vs signal"),
    slide('''<div class="eyebrow">En chiffres</div>
<h1 class="sm">Ce que le signal représente, chaque mois.</h1>
<div class="grid2">
<div class="stat"><div class="n">727</div><div class="l">reprises CHR sur 30 jours en France</div></div>
<div class="stat"><div class="n">82 %</div><div class="l">livrées avec le téléphone de l'établissement</div></div>
<div class="stat"><div class="n">24 h</div><div class="l">entre la publication et votre email</div></div>
<div class="stat"><div class="n">90 j</div><div class="l">de fenêtre d'achat après la reprise</div></div>
</div>''', "dark", n=3, total=4, tag="Source : BODACC, base au 20/09/2026"),
    slide('''<div class="eyebrow">LeBonProspect</div>
<h1 class="md">Gardez votre fichier. Ajoutez le signal.</h1>
<p class="lead">Dès 149 € par mois pour un département, 299 € pour une région. Sans engagement, résiliable en un clic. Premier email demain à 8h.</p>
<div class="cta">Voir les reprises de ma zone</div><div class="url">lebonprospect.fr</div>''', "teal", n=4, total=4, tag="Stock vs signal"),
]


# ---------- POST 7 : carrousel "Une journée au Journal officiel" (le 20 septembre, en vrai) ----------
p7 = [
    slide('''<div class="eyebrow">Samedi 20 septembre 2026</div>
<h1>Une journée ordinaire <span class="hl">au Journal officiel.</span></h1>
<p class="lead">Ce que contenait l'édition du jour, une fois triée par métier. Rien d'inventé : tout est vérifiable au BODACC.</p>''', n=1, total=5, tag="Une journée au Journal officiel"),
    slide('''<div class="eyebrow">Édition du 20/09 · cessions de fonds de commerce</div>
<div class="big">179</div>
<h1 class="sm" style="margin-top:20px">commerces ont changé de propriétaire ce jour-là.</h1>
<p class="lead">Dont 48 restaurants, bars et hôtels. 22 commerces alimentaires. 10 salons de coiffure et instituts. 7 pharmacies et commerces de santé. 4 garages.</p>''', "dark", n=2, total=5, tag="Une journée au Journal officiel"),
    slide('''<div class="eyebrow">Ce que ça représente, concrètement</div>
<h1 class="sm">48 restaurateurs qui, ce matin-là, avaient tout à acheter.</h1>
<div class="list">
<div class="item"><div class="n">48</div><div><b>enseignes à refaire</b><span>ou au minimum à remettre à leur nom</span></div></div>
<div class="item"><div class="n">48</div><div><b>cuisines à inspecter</b><span>froid, cuisson, laverie : ce qui lâche se voit dans les 30 jours</span></div></div>
<div class="item"><div class="n">48</div><div><b>contrats à renégocier</b><span>boissons, assurance, caisse, maintenance</span></div></div>
</div>''', n=3, total=5, tag="Une journée au Journal officiel"),
    slide('''<div class="eyebrow">Le détail que personne ne regarde</div>
<div class="quote">44 % de ces repreneurs ont créé leur société il y a moins de 90 jours.<br><br>Ils viennent d'arriver. Leurs budgets sont ouverts. Ils n'ont encore dit oui à personne.</div>''', "teal", n=4, total=5, tag="Source : BODACC + registre des sociétés, 90 derniers jours"),
    slide('''<div class="eyebrow">LeBonProspect</div>
<h1 class="md">Ces 48-là, nos abonnés les ont eus dimanche à 8h.</h1>
<p class="lead">Avec le nom du repreneur, l'adresse et le téléphone de l'établissement. Triés par métier, par zone. Vous, vous en avez appelé combien ?</p>
<div class="cta">Recevoir ceux de ma zone</div><div class="url">lebonprospect.fr</div>''', n=5, total=5, tag="Une journée au Journal officiel"),
]

# ---------- POST 8 : image unique, le badge "budgets ouverts" (44 %) ----------
p8 = [
    slide('''<div class="eyebrow">Restaurants, bars et hôtels · 90 derniers jours</div>
<div class="big">44 %</div>
<h1 class="sm" style="margin-top:26px">des repreneurs ont créé leur société il y a moins de 90 jours.</h1>
<p class="lead">Ce sont les nouveaux entrants. Pas encore de fournisseur attitré, un budget validé par la banque, et une liste de choses à changer qui s'allonge chaque jour. Dans nos emails, ils portent un badge : <b>budgets ouverts</b>. C'est eux qu'on appelle en premier.</p>
<div class="url">lebonprospect.fr</div>''', "dark", tag="Source : BODACC + registre des sociétés, 2 865 reprises analysées"),
]

# ---------- POST 9 : carrousel "Où ça se passe" (top villes CHR 90 jours) ----------
p9 = [
    slide('''<div class="eyebrow">Restaurants, bars et hôtels · 90 derniers jours</div>
<h1>Où les commerces changent de mains <span class="hl">en ce moment.</span></h1>
<p class="lead">Les villes qui ont vu le plus de reprises CHR publiées au Journal officiel depuis fin juin.</p>''', n=1, total=4, tag="Où ça se passe"),
    slide('''<div class="eyebrow">Top 6 · reprises CHR sur 90 jours</div>
<div style="margin-top:30px">
<div class="stat" style="flex-direction:row;align-items:baseline;gap:28px;padding:14px 0;border-top:2px solid #E6E0D0"><div class="n" style="font-size:96px;min-width:220px">233</div><div class="l" style="font-size:34px;font-family:Archivo,sans-serif;font-weight:800;color:#14181D">Paris</div></div>
<div class="stat" style="flex-direction:row;align-items:baseline;gap:28px;padding:14px 0;border-top:2px solid #E6E0D0"><div class="n" style="font-size:96px;min-width:220px">51</div><div class="l" style="font-size:34px;font-family:Archivo,sans-serif;font-weight:800;color:#14181D">Brest</div></div>
<div class="stat" style="flex-direction:row;align-items:baseline;gap:28px;padding:14px 0;border-top:2px solid #E6E0D0"><div class="n" style="font-size:96px;min-width:220px">43</div><div class="l" style="font-size:34px;font-family:Archivo,sans-serif;font-weight:800;color:#14181D">Nice</div></div>
<div class="stat" style="flex-direction:row;align-items:baseline;gap:28px;padding:14px 0;border-top:2px solid #E6E0D0"><div class="n" style="font-size:96px;min-width:220px">36</div><div class="l" style="font-size:34px;font-family:Archivo,sans-serif;font-weight:800;color:#14181D">Lyon</div></div>
<div class="stat" style="flex-direction:row;align-items:baseline;gap:28px;padding:14px 0;border-top:2px solid #E6E0D0;border-bottom:2px solid #E6E0D0"><div class="n" style="font-size:96px;min-width:220px">24</div><div class="l" style="font-size:34px;font-family:Archivo,sans-serif;font-weight:800;color:#14181D">Toulouse · Bordeaux</div></div>
</div>''', n=2, total=4, tag="Source : BODACC, 90 derniers jours"),
    slide('''<div class="eyebrow">Ce que ça veut dire</div>
<div class="quote">Brest devant Nice et Lyon. Personne ne l'aurait parié.<br><br>Le marché des reprises ne suit pas la taille des villes. Il suit les départs à la retraite, les cessions, les fins de bail. Et il se lit tous les matins au Journal officiel.</div>''', "teal", n=3, total=4, tag="Où ça se passe"),
    slide('''<div class="eyebrow">Votre ville, votre métier</div>
<h1 class="md">Les chiffres de chaque région, mis à jour chaque jour.</h1>
<p class="lead">Restaurants, boulangeries, salons, garages, pharmacies : le nombre de reprises sur 12 mois, région par région, et les dernières publiées. En accès libre.</p>
<div class="cta">Voir ma région</div><div class="url">lebonprospect.fr/reprises</div>''', "dark", n=4, total=4, tag="Où ça se passe"),
]

POSTS = {
    "01_comment_ca_marche": p1,
    "02_chiffre_47305": p2,
    "03_public_vs_exploitable": p3,
    "04_les_dernieres_en_vrai": p4,
    "05_repreneur_vs_createur": p5,
    "06_stock_vs_signal": p6,
    "07_une_journee_au_jo": p7,
    "08_budgets_ouverts_44": p8,
    "09_ou_ca_se_passe": p9,
}
