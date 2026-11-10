import "./hp.css";
import Icon, { Logo } from "./components/Icon";
import NavMobile from "./components/NavMobile";
import ZoneMap from "./components/ZoneMap";
import Calculateur from "./components/Calculateur";
import { getChiffres, getFlux, EXEMPLE, dateCourte, dateLongue, dateNum } from "./lib/homeData";
import { TARIFS } from "./lib/tarifs";
import { fr, nombre } from "./lib/typo";

export const revalidate = 3600; // chiffres et flux rafraîchis toutes les heures

// Home « unslop » (brief du 10 nov. 2026) : tout le style vit sous .hp (hp.css), rien n'est partagé avec les autres routes.

const STEPS = [
  { n: "01", title: "Journal officiel", desc: "Chaque cession de fonds de commerce est publiée par obligation légale." },
  { n: "02", title: "Tri métier et zone", desc: "Sur des dizaines de pages de jargon juridique, on isole vos reprises." },
  { n: "03", title: "Repreneur identifié", desc: "Société, dirigeant, adresse, et le téléphone de l'établissement quand on l'a vérifié." },
  { n: "04", title: "Email avant 8h", desc: "Les reprises prêtes à appeler, dans votre boîte mail." },
];
const RECIT = [
  { when: "Lundi, jour J", title: "Le rachat est signé chez le notaire", body: "Exemple : un restaurateur reprend « Le Petit Zinc » à Lyon. La cession est publiée au Journal officiel : c'est une obligation légale, personne n'y échappe." },
  { when: "Mardi, avant 8h", title: "Le nom du repreneur est dans votre email", body: "Parmi les pages de jargon juridique publiées ce matin-là, quelques reprises concernent votre métier et votre zone. On les a trouvées et identifiées." },
  { when: "Mardi, 9h15", title: "Vous êtes le premier à appeler", body: "« Félicitations pour la reprise ! » Le repreneur a mille choses à acheter et zéro fournisseur attitré. Le premier qui appelle prend une longueur d'avance." },
];
const EMAIL_STEPS = [
  ["Détecté cette nuit", "au Journal officiel, trié pour votre métier et votre zone"],
  ["Repreneur identifié", "nom, société, adresse de l'établissement repris"],
  ["Numéro vérifié", "quand on le trouve, un tap suffit"],
];
const METIERS = [
  ["Agenceurs & aménagement", "Le repreneur refait la salle, la terrasse, le bar. Il cherche un agenceur dans les premières semaines, pas dans un an."],
  ["Matériel de cuisine pro", "Fours, frigos, hottes, plonge : un rachat s'accompagne presque toujours d'un renouvellement d'équipement."],
  ["Caisse & encaissement", "Nouvelle société, nouveau contrat de caisse. C'est le moment exact où il compare les offres."],
  ["Enseignes & signalétique", "Changement de nom, nouvelle identité visuelle : l'enseigne est l'un des premiers postes de dépense d'une reprise."],
  ["Brasseurs & boissons", "Les contrats de bière, café, boissons sont renégociés à chaque reprise. Le premier qui appelle signe souvent."],
  ["Assurance & services pro", "Multirisque, prévoyance, mutuelle, banque, télécom : tout est à remettre à plat dans les 90 jours."],
];
const WHY = [
  ["Financement", "Son dossier de financement tient", "Pour racheter un fonds, il a réuni un financement : banque ou apport personnel. Ce n'est pas un projet sur papier."],
  ["Budget", "Il vient d'investir, il a du budget", "Il a mis de l'argent sur la table pour reprendre. Il en remettra pour équiper, rénover, relancer. La fenêtre d'achat est ouverte."],
  ["Contrats", "Tous ses contrats sont à renégocier", "Fournisseurs, banque, assurance, télécom, caisse : le repreneur remet tout à plat dans les 90 jours. Vous arrivez au bon moment, pas trop tard."],
];
const BODACC = [
  "Une raison sociale et une adresse, noyées dans des dizaines de pages de jargon juridique",
  "Aucun tri par métier ni par zone : tout est mélangé, partout en France",
  "Aucun numéro de téléphone",
  "Aucun nom de dirigeant, aucune fiche entreprise",
  "Aucun signal pour savoir si le repreneur vient de s'installer ou s'il est déjà en activité",
];
const LBP = [
  "Les reprises de votre métier, dans votre zone, publiées la veille",
  "Le repreneur identifié : société, dirigeant, adresse de l'établissement",
  "Le numéro de téléphone quand on l'a vérifié, prêt à composer",
  "Un badge « budgets ouverts » pour savoir qui appeler en premier",
  "À J+1, avant votre concurrent. Pas à J+30.",
];
const PLANS = [
  { k: "departement", nom: TARIFS.departement.label, prix: TARIFS.departement.prix, sous: "un département au choix, sans engagement", href: TARIFS.departement.stripe, cta: "Choisir mon département", vedette: true,
    feat: ["1 département au choix", "Email chaque matin avant 8h", "Nom, société et adresse du repreneur", "Numéro de l'établissement, quand il est vérifié"] },
  { k: "region", nom: TARIFS.region.label, prix: TARIFS.region.prix, sous: "tous les départements de votre région", href: TARIFS.region.stripe, cta: "Choisir ma région",
    feat: ["1 région complète", "Toutes les verticales de votre métier", "Export CSV pour votre CRM", "Support prioritaire"] },
  { k: "national", nom: TARIFS.national.label, prix: null, sous: "multi-régions, équipes commerciales, national", href: TARIFS.national.mailto, cta: "Parler à un humain",
    feat: ["France entière ou multi-régions", "Chaque commercial reçoit les reprises de son secteur", "Export CSV & intégration CRM", "Interlocuteur dédié"] },
];
const faq = (parMois) => [
  ["D'où viennent les données ?", "Du BODACC, le Bulletin officiel des annonces civiles et commerciales. Chaque cession de fonds de commerce y est publiée par obligation légale. Nous ne faisons que la détecter, la trier par métier et par zone, et l'enrichir avec l'identité du repreneur et, quand on le trouve et qu'on le vérifie, le téléphone de l'établissement. Chaque ligne reste vérifiable publiquement, gratuitement, pour toujours."],
  ["Pourquoi payer, si le BODACC est public ?", "Parce que le BODACC est public, mais pas exploitable. Ce que vous achetez, ce n'est pas l'accès à l'information : c'est la fiche prête à appeler, le matin même de la publication, avant votre concurrent. Un repreneur choisit ses fournisseurs dans les 90 jours. Arriver à J+1 plutôt qu'à J+30, c'est toute la différence entre signer et arriver après."],
  ["Comment démarcher ces repreneurs dans les règles ?", "Les reprises viennent d'annonces officielles, publiées au BODACC. Entre professionnels, la règle est simple : présentez-vous clairement, proposez une offre en rapport avec l'activité du repreneur, et respectez sa demande s'il ne souhaite plus être contacté. Le démarchage reste sous votre responsabilité, comme tout démarchage commercial."],
  ["Combien de reprises vais-je recevoir chaque jour ?", `Ça dépend de votre zone et de votre métier. À l'échelle nationale, environ ${nombre(Math.round(parMois / 100) * 100)} commerces changent de mains chaque mois. Sur un département dense comme Paris ou le Rhône, comptez plusieurs reprises par jour dans le secteur CHR ; sur un département rural, quelques-unes par semaine. La carte ci-dessus vous montre le volume réel de votre département.`],
  ["Sans engagement, ça veut dire quoi concrètement ?", "Vous payez mois par mois et vous pouvez résilier en un clic depuis votre espace client, sans préavis ni justification. Si vous préférez vous engager sur 6 ou 12 mois, un ou deux mois vous sont offerts en échange."],
];

// Ligne de date « cartouche de journal » : 3 occurrences sur la page (carte du hero, carte email, tableau du flux).
const Dateline = ({ gauche, droite, sombre }) => (
  <div className={`hp-dateline${sombre ? " on-navy" : ""}`}>
    <span><i className="hp-pt" aria-hidden="true" />{gauche}</span>
    {droite && <span>{droite}</span>}
  </div>
);
const Tete = ({ eyebrow, h2, lead, live }) => (
  <div className="hp-head">
    <p className="hp-eyebrow">{live && <i className="hp-live" aria-hidden="true" />}{fr(eyebrow)}</p>
    <h2 className="hp-h2">{fr(h2)}</h2>
    {lead && <p className="hp-lead">{fr(lead)}</p>}
  </div>
);
const Fleche = ({ s = 16 }) => <Icon name="arrow-right" size={s} />;

// La vraie édition du matin (exemple anonymisé), en thème sombre (hero) ou clair (section Exemple d'email).
function Edition({ ex, sombre }) {
  return (
    <div className={`hp-edition${sombre ? " on-navy" : ""}`}>
      {sombre ? (
        <Dateline sombre gauche={`Exemple · édition du ${dateNum(ex.date)}`} droite="avant 8h" />
      ) : (
        <div className="hp-ed-brand">
          <Logo size={32} />
          <div><b>LeBonProspect</b><span>{ex.nZone} reprises de commerces · votre zone</span></div>
          <Dateline gauche={`Exemple · édition du ${dateNum(ex.date)}`} />
        </div>
      )}
      <div className="hp-ed-body">
        {sombre ? (
          <div className="hp-ed-titre"><p className="hp-ed-h">{ex.nZone} reprises dans la zone</p><p>{fr(`${ex.zone} · ${ex.metier}`)}</p></div>
        ) : (
          <div className="hp-ed-titre">
            <p className="hp-ed-h">{ex.nZone} commerces viennent de changer de mains</p>
            <p>{fr(`${ex.metier} · publiés au Journal officiel le ${dateLongue(ex.date)}`)}</p>
            <p className="hp-ed-note">{fr("Le nom et la société du repreneur sont en clair dans l'email.")}</p>
          </div>
        )}
        <ul className="hp-ed-rows">
          {ex.rows.map((r) => (
            <li key={r.place}>
              <div className="hp-ed-txt">
                <div className="hp-ed-l1"><b>{fr(r.name)}</b><span className={`hp-sig${r.badge === "budgets ouverts" ? " on" : ""}`}><i aria-hidden="true" />{r.badge}</span></div>
                <span className="hp-ed-l2">{fr(r.place)}{sombre && " · repreneur identifié"}</span>
              </div>
              <span className="hp-tel"><Icon name="phone" />{r.phone}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="hp-ed-foot">+ {ex.nZone - ex.rows.length} autres reprises {sombre ? "ce jour-là dans la zone" : "dans cette édition"}</div>
    </div>
  );
}

export default async function Home() {
  const [ch, flux] = await Promise.all([getChiffres(), getFlux()]);
  const ex = EXEMPLE;
  const parMois = nombre(ch.parMois);

  return (
    <div className="hp">
      {/* ============ HERO ============ */}
      <section className="hp-hero">
        <div className="hp-wrap hp-nav">
          <a href="/" className="hp-logo"><Logo />LeBonProspect</a>
          <nav className="hp-nav-links" aria-label="Navigation principale">
            <a href="#comment">Comment ça marche</a>
            <a href="#exemple">{fr("Exemple d'email")}</a>
            <a href="#pour-qui">Pour qui</a>
            <a href="/reprises">Reprises par région</a>
            <a href="#tarifs">Tarifs</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="hp-nav-r">
            <a href="#zone" className="hp-btn hp-btn-nav">Voir ma zone</a>
            <NavMobile />
          </div>
        </div>

        <div className="hp-wrap">
          <div className="hp-hero-grid">
            <div className="hp-hero-l">
              <h1 className="hp-h1 hp-in" style={{ "--d": "0ms" }}>
                <span className="hp-acc">{parMois}</span> commerces changent de mains chaque mois. Appelez le repreneur à <span className="hp-acc">J+1,</span> pas à <span className="hp-dim">J+30.</span>
              </h1>
              <p className="hp-hero-sub hp-in" style={{ "--d": "50ms" }}>
                {fr("Chaque matin avant 8h, recevez les reprises de votre métier et de votre zone, avec le nom du repreneur ")}<strong>{fr("et son numéro quand on l'a vérifié")}</strong>.
              </p>
              <div className="hp-ctas hp-in" style={{ "--d": "100ms" }}>
                <a href="#zone" className="hp-btn hp-btn-lg">Voir les reprises de ma zone <Fleche s={18} /></a>
                {flux && <a href="#feed" className="hp-link on-navy">Voir les reprises du {dateCourte(flux.date)} <Fleche /></a>}
              </div>
              <p className="hp-hero-note">{fr("Sans engagement · Données 100 % officielles · Aucun lead revendu")}</p>
            </div>

            <div className="hp-hero-r hp-in" style={{ "--d": "150ms" }}>
              <div>
                <Edition ex={ex} sombre />
                <p className="hp-ed-cap">{fr("Chaque reprise est un acte officiel, vérifiable.")}</p>
              </div>
              <div className="hp-delay">
                <p className="hp-delay-t">Délai avant le premier appel</p>
                <div className="hp-delay-row">
                  <div><span className="a">Avec LeBonProspect</span><span className="v acc">J+1</span></div>
                  <div className="hp-track"><i className="j1" /></div>
                </div>
                <div className="hp-delay-row">
                  <div><span>Sans le tri du BODACC</span><span className="v">J+30</span></div>
                  <div className="hp-track"><i className="j30" /></div>
                </div>
              </div>
            </div>
          </div>

          <div className="hp-facts">
            <div><b>Avant 8h</b><span>le matin même de la publication</span></div>
            <div><b>{nombre(TARIFS.departement.prix)}{"\u00a0"}€</b><span>par mois, par département</span></div>
            <div><b>Votre point mort</b><a href="#calculateur" className="hp-link on-navy sm">Le calculer avec vos chiffres <Fleche /></a></div>
          </div>
        </div>
      </section>

      {/* ============ COMMENT ÇA MARCHE ============ */}
      <section id="comment" className="hp-sec">
        <div className="hp-wrap">
          <Tete eyebrow="Comment ça marche" h2="De la signature chez le notaire à votre premier appel" lead="De la publication légale à votre boîte mail, tout se fait sans vous." />
          <ol className="hp-rail">
            {STEPS.map((s) => (
              <li key={s.n}><span className="hp-rail-n">{s.n}</span><h3>{fr(s.title)}</h3><p>{fr(s.desc)}</p></li>
            ))}
          </ol>
          <p className="hp-recit-l">Exemple</p>
          <ol className="hp-rail recit">
            {RECIT.map((r) => (
              <li key={r.when}><span className="hp-rail-n">{fr(r.when)}</span><h3>{fr(r.title)}</h3><p>{fr(r.body)}</p></li>
            ))}
          </ol>
        </div>
      </section>

      {/* ============ CARTE + CALCULATEUR ============ */}
      <ZoneMap parMois={ch.parMois} />
      <Calculateur />

      {/* ============ EXEMPLE D'EMAIL ============ */}
      <section id="exemple" className="hp-sec">
        <div className="hp-wrap hp-split">
          <div className="hp-split-l">
            <Tete eyebrow="Exemple d'email" h2="Voici votre matin, avant 8h" lead="Pas de dashboard à ouvrir, pas de logiciel à apprendre. Un email, des reprises, des numéros. Vous lisez, vous appelez." />
            <ul className="hp-steps">
              {EMAIL_STEPS.map(([t, d]) => <li key={t}><b>{fr(t)}</b><span>{fr(d)}</span></li>)}
            </ul>
          </div>
          <div className="hp-split-r"><Edition ex={ex} /></div>
        </div>
      </section>

      {/* ============ FLUX EN DIRECT ============ */}
      <section id="feed" className="hp-sec hp-white">
        <div className="hp-wrap">
          <Tete live eyebrow="En direct du Journal officiel" h2={`Publiées ${flux ? `le ${dateLongue(flux.date)}` : "récemment"}`}
            lead="Annonces réelles, mises à jour automatiquement. Chaque ligne est vérifiable au BODACC, gratuitement. Le badge indique si le repreneur vient de s'installer ou s'il est déjà en activité, pour prioriser vos appels." />
          {flux && (
            <div className="hp-feed">
              <div className="hp-feed-top"><b>Flux quotidien</b><Dateline gauche={`Édition du ${dateNum(flux.date)}`} /></div>
              <div className="hp-feed-head" aria-hidden="true"><span className="c1">Établissement</span><span className="c2">Zone</span><span className="c3">Repreneur</span><span className="c4">Téléphone</span><span className="c5">Signal</span></div>
              <ul className="hp-feed-list">
                {flux.items.map((r) => (
                  <li key={r.id} className="hp-feed-row">
                    <span className="c1">{fr(r.nom)}</span>
                    <span className="c2">{fr(`${r.commune} · ${r.dep}`)}</span>
                    <span className="c3"><Icon name="lock" size={14} />identifié</span>
                    <span className="c4">{r.numero ? "vérifié, réservé aux abonnés" : "en recherche"}</span>
                    <span className="c5">{r.badge && <span className={`hp-badge${r.badge === "budgets ouverts" ? " on" : ""}`}>{r.badge}</span>}</span>
                    <span className="hp-feed-m">{fr(`${r.commune} · ${r.dep} · repreneur identifié · téléphone ${r.numero ? "vérifié" : "en recherche"}`)}</span>
                  </li>
                ))}
              </ul>
              <div className="hp-paywall">
                <div className="hp-skel" aria-hidden="true">
                  {[["62%", "48%", "40%", "54%"], ["50%", "60%", "40%", "46%"], ["58%", "44%", "40%", "60%"]].map((k, i) => (
                    <div key={i} className="hp-skel-row">{k.map((w, j) => <span key={j} className={`c${j + 1}`}><i style={{ width: w }} /></span>)}<span className="c5"><i className="pill" /></span></div>
                  ))}
                </div>
                <div className="hp-paybar">
                  <p><strong>{nombre(flux.autres)} autres cessions</strong> publiées le même jour partout en France</p>
                  <a href="#tarifs" className="hp-btn">Accéder au flux complet <Fleche /></a>
                </div>
              </div>
            </div>
          )}
          <p className="hp-after">{fr("Envie de vérifier une annonce ? Chacune reste consultable au Journal officiel. Ce que vous ne trouverez pas là-bas : le tri par métier, l'identité complète du repreneur, sa fiche entreprise. Ça, c'est notre travail.")}</p>
        </div>
      </section>

      {/* ============ POUR QUI ============ */}
      <section id="pour-qui" className="hp-sec">
        <div className="hp-wrap">
          <Tete eyebrow="Pour qui" h2="Si vous équipez des cafés, bars, restaurants ou hôtels, c'est pour vous" lead="Six métiers pour qui une reprise est le meilleur moment pour signer un nouveau client." />
          <ul className="hp-filets">
            {METIERS.map(([t, b]) => <li key={t}><h3>{fr(t)}</h3><p>{fr(b)}</p></li>)}
          </ul>
        </div>
      </section>

      {/* ============ POURQUOI LE REPRENEUR ============ */}
      <section className="hp-sec hp-sec-t0">
        <div className="hp-wrap">
          <Tete eyebrow="Pourquoi le repreneur" h2="Un repreneur, ce n'est pas une création d'entreprise" lead="Les annuaires de créations vous envoient vers des coquilles vides. Une reprise, c'est l'inverse." />
          <ul className="hp-cols3">
            {WHY.map(([e, t, b]) => <li key={e}><span className="hp-rail-n">{e}</span><h3>{fr(t)}</h3><p>{fr(b)}</p></li>)}
          </ul>
        </div>
      </section>

      {/* ============ BODACC CONTRE VOUS ============ */}
      <section className="hp-sec hp-sec-t0">
        <div className="hp-wrap">
          <Tete eyebrow="La question que tout le monde se pose" h2="Oui, le BODACC est public. Ce n'est pas ce que vous achetez" lead="Ce que contient le Journal officiel, et ce que vous recevez avant 8h." />
          <div className="hp-vs">
            <div className="hp-vs-col">
              <p className="hp-vs-t">Ce que le BODACC contient</p>
              <ul>{BODACC.map((t) => <li key={t}><Icon name="x" /><span>{fr(t)}</span></li>)}</ul>
              <p className="hp-vs-foot">Public, oui. Exploitable, non.</p>
            </div>
            <div className="hp-vs-col on">
              <p className="hp-vs-t">Ce que vous recevez avant 8h</p>
              <ul>{LBP.map((t) => <li key={t}><Icon name="check" /><span>{fr(t)}</span></li>)}</ul>
              <a href="#calculateur" className="hp-link">Calculer mon point mort avec mes chiffres <Fleche /></a>
            </div>
          </div>
        </div>
      </section>

      {/* ============ TARIFS ============ */}
      <section id="tarifs" className="hp-sec hp-white">
        <div className="hp-wrap">
          <Tete eyebrow="Tarifs" h2="Un tarif selon la taille de votre zone" />
          <div className="hp-plans">
            {PLANS.map((p) => (
              <div key={p.k} className={`hp-plan${p.vedette ? " on" : ""}`}>
                <p className="hp-plan-n">{p.nom}</p>
                {p.prix ? (
                  <p className="hp-plan-p"><b>{nombre(p.prix)}{"\u00a0"}€</b><span>/mois</span></p>
                ) : (
                  <p className="hp-plan-p devis"><b>Sur devis</b></p>
                )}
                <p className="hp-plan-s">{fr(p.sous)}</p>
                <ul>{p.feat.map((t) => <li key={t}><Icon name="check" /><span>{fr(t)}</span></li>)}</ul>
                <a href={p.href} className={`hp-btn${p.vedette ? "" : " hp-btn-2"}`}>{p.cta}</a>
              </div>
            ))}
          </div>
          <p className="hp-engage">{fr("Sans engagement, résiliable en 1 clic · engagement 6 mois : ")}<strong>1 mois offert</strong>{fr(" · engagement 12 mois : ")}<strong>2 mois offerts</strong></p>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" className="hp-sec">
        <div className="hp-wrap hp-faq-grid">
          <div className="hp-faq-l">
            <p className="hp-eyebrow">Questions fréquentes</p>
            <h2 className="hp-h2 sm">{fr("Tout ce qu'on nous demande avant de s'abonner")}</h2>
          </div>
          <div className="hp-faq">
            {faq(ch.parMois).map(([q, a], i) => (
              <details key={q} open={i === 1}>
                <summary><span>{fr(q)}</span><i className="hp-faq-ico" aria-hidden="true"><Icon name="plus" size={20} className="p" /><Icon name="minus" size={20} className="m" /></i></summary>
                <p>{fr(a)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ============ APPEL FINAL ============ */}
      <section className="hp-final-wrap">
        <div className="hp-wrap">
          <div className="hp-final">
            <h2>{fr("Demain matin, avant 8h, les reprises de votre zone seront dans votre boîte mail")}</h2>
            <p>{fr("Le premier fournisseur qui appelle prend une longueur d'avance. Autant que ce soit vous.")}</p>
            <a href="#zone" className="hp-btn hp-btn-lg">Voir les reprises de ma zone <Fleche s={18} /></a>
            <p className="hp-final-note">{fr("Sans engagement · Résiliable en 1 clic · Données 100 % officielles")}</p>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="hp-foot">
        <div className="hp-wrap">
          <div className="hp-foot-top">
            <div className="hp-foot-brand">
              <a href="/" className="hp-logo"><Logo />LeBonProspect</a>
              <p>{fr("Les reprises de commerces publiées au BODACC, avec le nom du repreneur, l'adresse et le téléphone quand il est vérifié, dans votre boîte mail avant 8h.")}</p>
              <a href="#zone" className="hp-link on-navy">Voir les reprises de ma zone <Fleche /></a>
            </div>
            <div className="hp-foot-cols">
              <div><p>Produit</p><a href="#comment">Comment ça marche</a><a href="#zone">Choisir ma zone</a><a href="#calculateur">Calculateur</a><a href="#exemple">{fr("Exemple d'email")}</a><a href="#tarifs">Tarifs</a></div>
              <div><p>Ressources</p><a href="/reprises">Reprises par région</a><a href="#pour-qui">Pour qui</a><a href="#faq">FAQ</a><a href="mailto:contact@lebonprospect.fr">Contact</a></div>
              <div><p>Légal</p><a href="/mentions-legales">Mentions légales</a><a href="/cgv">CGV</a><a href="/confidentialite">Confidentialité</a></div>
            </div>
          </div>
          <div className="hp-foot-bot">
            <span>© 2026 LeBonProspect. Tous droits réservés.</span>
            <span>{fr("Données publiques BODACC, réutilisées sous licence ouverte. Contours des départements : svg-maps, Victor Cazanave (CC BY 4.0).")}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
