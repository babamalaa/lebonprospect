// Trames d'appel v2 (Lawrenza, 21 sept. 2026), organisées dans l'ordre d'un appel.
// Blocs : { title, style: ""|"teal"|"dark", text?, list? }
// Un bloc avec essaiOnly: true n'est affiché que pour les comptes autorisés à proposer l'essai 7 jours (profile.essai_autorise).
// Un bloc avec noEssai: true n'est affiché que pour les autres.

const SCRIPTS_V2 = [
  {
    id: "ouverture",
    label: "1 · Les 30 premières secondes",
    desc: "Identique pour toutes les cibles. C'est la seule partie à savoir par cœur. On qualifie avant de pitcher : la question de disqualification tombe à la seconde 20, avant le moindre argument.",
    blocks: [
      {
        title: "Avant de composer",
        style: "dark",
        list: [
          "Ouvrir la fiche du prospect : sa page personnalisée doit être générée et le lien prêt à envoyer par SMS.",
          "Repérer dans l'espace closer une reprise réelle, récente, dans sa zone et dans son métier. Sans reprise réelle sous les yeux, on n'appelle pas.",
          "Lire le chiffre réel de SA zone (reprises sur 30 jours) sur sa page. On ne cite jamais un chiffre qu'on ne peut pas montrer pendant l'appel.",
        ],
      },
      {
        title: "L'ouverture (8 secondes)",
        style: "teal",
        text: `« Bonjour [Prénom], [votre prénom] de LeBonProspect. Je vous appelle pour une raison précise : [Le Bousti], un restaurant à [Marseille], vient de changer de mains, la cession est parue au Journal officiel jeudi. »

Une raison précise d'appeler, jamais une présentation d'entreprise. On ne demande pas « vous avez deux minutes ? » : ça invite le non, alors que la raison précise fait le même travail sans offrir de sortie.`,
      },
      {
        title: "Variante : le prospect a reçu l'email « un lead gratuit »",
        style: "",
        text: `Quand la fiche porte la mention « A reçu [commerce] le [date] », l'appel n'est plus à froid. On ouvre dessus, pas sur une autre reprise :

« Bonjour [Prénom], [votre prénom] de LeBonProspect. Je vous ai envoyé [lundi] le contact de [Hotel de la Poste], à [Bantzenheim], qui vient de changer de propriétaire. Vous avez eu le temps de l'appeler ? »

Trois réponses possibles :
· « Oui » : « Et ça a donné quoi ? » On écoute. C'est la démonstration du produit, faite par lui.
· « Non, pas encore » : « Il est toujours à vous. Vous cherchez à prendre de nouveaux clients en ce moment, ou vous êtes déjà à fond ? » On revient sur la question de qualification.
· « Je ne l'ai pas vu » : « Je vous le renvoie là, maintenant, regardez votre boîte. » Puis la question de qualification.`,
      },
      {
        title: "La question de qualification (5 secondes)",
        style: "teal",
        text: `« Avant de vous en dire plus : vous cherchez à prendre de nouveaux clients en ce moment, ou vous êtes déjà à fond ? »

La plus importante de l'appel. Question ouverte, aucun « non » possible. Elle place le closer en position de sélectionner plutôt que de quémander, et sa réponse décide de tout le reste.

Règle : on ne prononce pas le mot « abonnement » avant d'avoir sa réponse.`,
      },
      {
        title: "L'aiguillage",
        style: "",
        list: [
          "« Je cherche », « j'en prends toujours » → Trame A ou B selon la taille de la structure.",
          "« Ça dépend des mois », « c'est irrégulier » → meilleur profil : Trame A, axée sur le creux.",
          "« Je suis débordé », « j'ai déjà trop de travail » → on ne pitche pas : fiche 6, Le non qui rapporte.",
          "« Ce n'est pas moi qui décide » → on demande qui, et à quelle heure le joindre.",
        ],
      },
    ],
  },
  {
    id: "trame_a",
    label: "2 · Trame A · L'artisan",
    desc: "Enseignistes, agenceurs, installateurs de caisse, matériel de cuisine, de une à dix personnes. Le patron répond sur son portable, souvent depuis un chantier. Ce qu'il achète : pas des leads, un carnet qui ne se vide pas. Son problème n'est pas le volume, c'est l'irrégularité.",
    blocks: [
      {
        title: "Le pitch (20 secondes, orienté résultat)",
        style: "teal",
        text: `« Concrètement : demain matin à 8h, vous avez sur votre téléphone les commerces de votre secteur qui ont changé de main, avec le nom du repreneur et son numéro. Vous en appelez un, vous vous présentez, vous êtes le premier à l'avoir eu. C'est tout le produit. »

Aucun mot technique, jamais « base de données » ni « BODACC », et on s'arrête là. Le silence après « c'est tout le produit » fait le travail.`,
      },
      {
        title: "La discovery (deux questions, puis on écoute)",
        style: "",
        text: `1. « Sur les douze derniers mois, vous avez travaillé pour combien de repreneurs ? »
2. « Et ceux-là, vous les avez su comment ? »

La deuxième est celle qui porte. La réponse est presque toujours « par hasard » ou « par le bouche-à-oreille » : c'est la démonstration du problème, faite par lui. On n'a plus à la faire.`,
      },
      {
        title: "Le chiffrage, avec SES chiffres",
        style: "",
        text: `« Un chantier chez vous, ça représente combien en moyenne ? » (laisser répondre)
« Donc [3 500 €]. L'abonnement, c'est 149 € par mois, 1 788 € sur l'année. Un seul chantier dans l'année et c'est remboursé deux fois. La vraie question, ce n'est pas le prix, c'est de savoir si vous en signez au moins un. »

On ne donne jamais le montant à sa place. S'il refuse de le dire, on passe à la suite sans insister.`,
      },
      {
        title: "La preuve : le moment décisif",
        style: "dark",
        text: `« Je vous envoie le lien par SMS, là, maintenant. Vous l'avez ? »

SMS, pas email : il est sur son portable, c'est instantané, et ça évite de lui demander son adresse au milieu de l'appel. Puis 10 à 15 secondes de silence pendant qu'il scrolle. On ne dit rien, on laisse la page travailler.

« Les numéros à moitié masqués que vous voyez, ce sont de vrais repreneurs de votre secteur, publiés cette semaine. »

Puis on enchaîne directement sur le close (fiche 4).`,
      },
    ],
  },
  {
    id: "trame_b",
    label: "3 · Trame B · La structure",
    desc: "Brasseurs et distributeurs de boissons, grossistes, monétique, assurance pro, énergie, télécom. Interlocuteur : directeur commercial, responsable réseau ou développement. Il n'a pas un problème de clients, il a un problème de productivité commerciale : on lui vend du temps commercial récupéré et un taux de prise de rendez-vous.",
    blocks: [
      {
        title: "L'ouverture, après la qualification",
        style: "teal",
        text: `« Vos commerciaux sur le secteur [X], quand un CHR change de propriétaire, ils l'apprennent comment aujourd'hui ? »

Laisser répondre. C'est toujours l'une des trois : par la tournée, par hasard, ou pas du tout.`,
      },
      {
        title: "L'argument central : le stock contre le signal",
        style: "dark",
        text: `« Vous avez sûrement déjà une base : Pappers, Societeinfo, Kompass, ou votre propre fichier. Ces outils vous donnent le stock : tous les restaurants de votre zone, en permanence. Nous, on vous donne le signal : lequel a changé de propriétaire hier. Le stock, vos commerciaux l'ont déjà et ils ne peuvent pas l'appeler en entier. Le signal, c'est les trois qu'il faut appeler cette semaine. »

C'est la seule chose qu'un outil de données générique ne fait pas, et c'est ce qui justifie un tarif sur devis.`,
      },
      {
        title: "Le chiffrage, dans sa monnaie",
        style: "",
        list: [
          "« Un commercial chez vous, combien de temps il passe à chercher qui appeler, avant même de décrocher ? »",
          "« Un nouveau client CHR signé, ça vaut combien sur la durée de vie du contrat ? »",
          "« Sur [21] agences, si chaque commercial reçoit chaque matin les reprises de SON secteur, il vous en faut combien de plus par an pour que ce soit rentable ? »",
          "On le laisse faire le calcul. S'il le fait à voix haute, le deal est à moitié fait.",
        ],
      },
      {
        title: "Le close : un pilote, pas un abonnement",
        style: "teal",
        text: `« Je vous propose un pilote : 30 jours, deux secteurs, deux commerciaux. Ils reçoivent leurs reprises chaque matin, et au bout du mois on regarde ensemble combien de rendez-vous ça a généré. Si le chiffre ne vous parle pas, on arrête là. Quels deux secteurs vous prendriez ? »

Un pilote ne se refuse presque jamais, il engage l'entreprise, et il produit la preuve chiffrée qui servira à vendre les deals suivants. Le pilote est un devis : il est cadré avec Lawrenza avant d'être confirmé au client.`,
      },
      {
        title: "Ce qu'on ne fait jamais en trame B",
        style: "",
        list: [
          "Citer 149 € ou 299 €. L'offre est sur devis ; annoncer un tarif départemental détruit la valeur perçue.",
          "Closer au premier appel. L'objectif du premier appel est un deuxième rendez-vous, calé avant de raccrocher, avec les bonnes personnes autour de la table.",
          "Envoyer la page personnalisée sans proposer de la parcourir ensemble.",
        ],
      },
    ],
  },
  {
    id: "close",
    label: "4 · Le close",
    desc: "On sort de l'appel avec un lien envoyé et une date de rappel, pas avec un oui ou un non à 149 € décidé en quatre minutes. On ne raccroche jamais sans créneau précis.",
    blocks: [
      {
        title: "Le close par défaut : l'essai 7 jours",
        style: "teal",
        essaiOnly: true,
        text: `« Voilà ce que je vous propose : sept jours gratuits. Sur la page que je vous ai envoyée, vous cliquez sur « Démarrer mon essai », vous mettez votre zone et votre carte, et vous n'êtes débité de rien pendant sept jours. Demain matin à 8h, vous recevez les vraies reprises de votre secteur avec les vrais numéros. Vous en appelez deux ou trois et vous verrez par vous-même. Si au bout de la semaine ça ne vous a rien apporté, vous arrêtez en un clic et ça ne vous a rien coûté. Vous le faites pendant qu'on est en ligne ? »

Il ne demande pas d'argent aujourd'hui, il ne demande pas de décision. La carte est renseignée dès maintenant : c'est ce qui fait qu'un essai est un vrai essai, et non un curieux. Un client en essai, c'est un prospect actif ; un « non » sur 149 €, c'est une fiche morte.`,
      },
      {
        title: "Le close par défaut : un mois, sans engagement",
        style: "teal",
        noEssai: true,
        text: `« Voilà ce que je vous propose : vous testez un mois. Sur la page que je vous ai envoyée, vous cliquez sur « Mon département » ou « Ma région », vous mettez votre zone, et demain matin à 8h vous recevez les vraies reprises de votre secteur avec les vrais numéros. Vous en appelez deux ou trois. C'est sans engagement : si au bout du mois ça ne vous a rien apporté, vous résiliez en un clic. Vous le faites pendant qu'on est en ligne ? »

On ne demande pas une décision d'un an, on demande un mois d'essai réel. Rester en ligne pendant qu'il valide : c'est le moment où les questions sortent, et où l'on y répond.`,
      },
      {
        title: "Enchaîner immédiatement sur la date",
        style: "dark",
        text: `« Parfait. Vous recevez votre première liste demain à 8h. Je vous rappelle vendredi en fin de matinée pour voir ce que ça a donné. Vendredi 11h, ça vous va ? »

On ne raccroche jamais sans créneau précis, noté dans la fiche (champ « prochaine action » + date). Sans date, l'essai meurt.`,
      },
      {
        title: "Les trois questions du rappel",
        style: "",
        list: [
          "« Vous avez appelé combien de repreneurs ? » S'il n'en a appelé aucun, l'essai n'a rien prouvé : on prolonge avec un engagement précis (« appelez-en trois, je vous rappelle jeudi »), on ne close pas.",
          "« Ça a donné quoi ? » On laisse parler, même si c'est négatif : c'est là qu'on apprend ce qui cloche dans le produit. On note sa phrase exacte.",
          "Puis on confirme la suite : l'abonnement continue au tarif normal, ou il résilie. Pas de remise improvisée : le tarif est celui du site.",
        ],
      },
    ],
  },
  {
    id: "objections",
    label: "5 · Banque d'objections",
    desc: "Règle d'or : ne jamais nier, retourner, puis chiffrer avec SES chiffres. Une seule réponse par objection, puis on se tait. Empiler trois arguments sonne récité et fait perdre l'appel.",
    blocks: [
      {
        title: "« Je suis débordé, j'ai déjà trop de travail »",
        style: "teal",
        text: `La plus fréquente sur le terrain. Ce n'est pas une objection, c'est une réponse vraie. On n'insiste pas.

« Tant mieux, c'est bon signe. Juste une chose : votre activité, elle est régulière toute l'année, ou vous avez des creux ? »

S'il a des creux : « C'est exactement pour ces mois-là. Vous testez un mois, sans engagement, et vous ne regardez que quand vous en avez besoin. »
S'il est plein toute l'année : on ne vend pas, on bascule sur Le non qui rapporte (fiche 6).`,
      },
      {
        title: "« C'est public, je peux le faire moi-même »",
        style: "",
        text: `« Vous avez raison, c'est public. Le bulletin d'hier fait 89 pages, tous secteurs et toute la France mélangés, sans téléphone ni nom de dirigeant. La question, ce n'est pas l'accès, c'est qui les lit tous les matins à votre place. »`,
      },
      {
        title: "« 149 € par mois, c'est cher »",
        style: "",
        text: `Ne jamais défendre le prix, le déplacer.

« Par rapport à quoi ? » (laisser répondre) « Un chantier chez vous, c'est [3 500 €]. Là on parle de 1 788 € sur l'année. Vous n'avez pas un problème de prix, vous avez un doute sur le fait que ça marche. Et c'est normal, vous ne me connaissez pas. C'est pour ça que c'est sans engagement : vous testez un mois et vous jugez sur de vrais numéros. »

Le prix est presque toujours un doute déguisé. L'essai répond au doute ; baisser le prix n'y répond pas.`,
      },
      {
        title: "« Vous avez combien de clients ? Qui l'utilise déjà ? »",
        style: "dark",
        text: `Inévitable, et on ne ment pas.

« On lance. Vous seriez parmi les premiers, et c'est exactement pour ça que je vous propose de tester sans engagement. Dans six mois je vous rappelle avec des références. »

Jamais un nombre de clients inventé, jamais un témoignage fabriqué. Un prospect qui vérifie et ne trouve rien, c'est le deal perdu et la réputation avec.`,
      },
      {
        title: "« Je serai le seul de mon secteur à le recevoir ? »",
        style: "",
        text: `Réponse honnête : il n'y a pas d'exclusivité.

« Non, l'information peut partir à un autre abonné de votre zone. Ce que je vous garantis, c'est que vous l'avez à 8h le lendemain de la publication. Celui qui appelle en premier signe. »`,
      },
      {
        title: "« On a déjà Pappers / Societeinfo / Kompass »",
        style: "",
        text: `« Gardez-les, ça ne fait pas la même chose. Eux vous donnent le stock : toutes les entreprises de votre zone, en permanence. Nous, le signal : laquelle a changé de propriétaire hier. Le stock, vous ne pouvez pas l'appeler en entier. Le signal, c'est les trois à appeler cette semaine. »`,
      },
      {
        title: "« Envoyez-moi une doc »",
        style: "",
        text: `« Je fais mieux : je vous envoie votre page, avec les vraies reprises de votre secteur et de vrais numéros. Vous jugez sur ça plutôt que sur un PDF. Je vous l'envoie par SMS, là ? »`,
      },
      {
        title: "« Je dois en parler à mon associé / mon équipe »",
        style: "",
        text: `« Logique. Je vous envoie la page, vous la regardez tous les deux, c'est la même chose que ce que vous recevriez chaque matin. Je vous rappelle [jour] : plutôt matin ou après-midi ? »

Toujours obtenir un créneau. Sans créneau, le deal est mort.`,
      },
      {
        title: "« On a déjà nos clients réguliers »",
        style: "",
        text: `« Bien sûr, c'est votre socle et ça ne bouge pas. Ça, c'est pour les nouveaux entrants : ceux qui n'ont pas encore de fournisseur attitré et qui en auront un dans les trois mois. La seule question, c'est si c'est vous ou quelqu'un d'autre. »`,
      },
      {
        title: "« Vous avez eu mon numéro où ? »",
        style: "",
        text: `« Sur votre fiche professionnelle publique. Si vous préférez que je ne vous rappelle pas, je vous retire tout de suite, dites-le-moi. »

Proposer spontanément le retrait désamorce complètement, et c'est ce que le RGPD demande. Ne jamais répondre « comme tout le monde », qui sonne méprisant. S'il demande le retrait : statut « Non », note « ne plus appeler ».`,
      },
      {
        title: "« Quand un repreneur me contacte, il a déjà tout commandé »",
        style: "",
        text: `Objection réelle chez les agenceurs et enseignistes : le repreneur fait chiffrer avant de signer, pour son dossier bancaire.

« C'est vrai sur les grosses reprises avec travaux financés. Sur les petites, qui sont la majorité, le repreneur découvre ce qu'il doit changer une fois dedans : l'enseigne encore au nom de l'ancien, la mise aux normes, le matériel qui lâche. On regarde ensemble trois reprises de votre secteur ce mois-ci, pour voir lesquelles sont dans ce cas ? »`,
      },
    ],
  },
  {
    id: "non",
    label: "6 · Le non qui rapporte",
    desc: "Sur la cible artisan, une bonne partie des appels finira par « je suis plein ». C'est une donnée, pas un échec, à condition d'en sortir trois choses avant de raccrocher.",
    blocks: [
      {
        title: "1. La date de rappel",
        style: "teal",
        text: `« Vous serez plus disponible vers quand ? Je vous rappelle à ce moment-là, et je ne vous embête pas d'ici là. »

On note la date dans la fiche (champ « prochaine action » + date). Deux cents artisans avec chacun une date de rappel, c'est un pipeline ; sans date, c'est une liste morte.`,
      },
      {
        title: "2. La recommandation",
        style: "",
        text: `« Une dernière chose et je vous laisse : vous connaissez quelqu'un dans le métier qui, lui, cherche à remplir son carnet en ce moment ? »

Posée juste après son refus, elle fonctionne mieux qu'ailleurs : il vient de dire non, il est disposé à rendre un service qui ne lui coûte rien. On note le nom et le numéro dans les notes de la fiche.`,
      },
      {
        title: "3. Le motif du non",
        style: "dark",
        list: [
          "Plein en ce moment → le produit l'intéresse, mais pas maintenant → statut « À rappeler » + date.",
          "Plein toute l'année → mauvaise cible → statut « Non », note « plein toute l'année ».",
          "Pas convaincu par le produit → problème d'offre → statut « Non » et sa phrase EXACTE dans les notes, non reformulée. Cinq « pas convaincu » avec la même phrase, c'est le produit ou la trame qu'il faut changer, pas le closer.",
        ],
      },
      {
        title: "La sortie propre",
        style: "",
        text: `« Merci d'avoir pris le temps. Je vous rappelle [date]. Bonne continuation. »

Pas de pique de sortie, pas de « vous saurez que ça existe ». On raccroche en laissant une bonne impression : sur un produit qui démarre, une bonne part des clients vient d'un deuxième appel.`,
      },
      {
        title: "Ce qu'on note après chaque appel (5 champs, pas plus)",
        style: "teal",
        list: [
          "Qualification : cherche / irrégulier / plein / pas décideur (menu « Qualif. » de la fiche).",
          "Son chiffre : panier moyen, ou nombre de repreneurs sur douze mois (dans les notes).",
          "Objection principale, dans SES mots, non reformulée (dans les notes).",
          "Issue : statut de la fiche (à rappeler, chaud, signé, non, mauvais prospect).",
          "Date et heure du prochain contact (champ « prochaine action » + date).",
        ],
      },
    ],
  },
];

export default SCRIPTS_V2;
