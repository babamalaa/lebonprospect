import Reveal from "./components/Reveal";
import ZoneMap from "./components/ZoneMap";
import Calculateur from "./components/Calculateur";
import { getChiffresChr, getFlux, EXEMPLE, dateCourte, dateLongue, dateNum } from "./lib/homeData";
import { TARIFS } from "./lib/tarifs";

export const revalidate = 3600; // chiffres et flux rafraîchis toutes les heures

const fmt = (n) => Number(n || 0).toLocaleString("fr-FR").replace(/\u202f/g, "\u00a0");
const Fleche = () => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18"><path d="M3 9h11M10 4.5L14.5 9 10 13.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const Logo = ({ size = 28 }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 28 28"><rect width="28" height="28" rx="8" fill="#31777A" /><path d="M8 14.5l4 4 8-9" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const Coche = ({ c = "#7CC3C6" }) => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" className="h-ico"><path d="M4 9.5l3.2 3.2L14 5.8" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const badgeCls = (b) => (b === "acquéreur établi" ? "h-badge neutre" : "h-badge");

const FLOW = [
  { tag: "01", title: "Journal officiel", desc: "Chaque cession de fonds de commerce est publiée par obligation légale.", icon: "M6 3h9l4 4v14H6z M15 3v4h4 M9 12h7 M9 16h7" },
  { tag: "02", title: "Tri métier et zone", desc: "Sur des dizaines de pages de jargon juridique, on isole vos reprises.", icon: "M3 5h18l-7 8v6l-4 2v-8z" },
  { tag: "03", title: "Enrichissement", desc: "Société, dirigeant, adresse, et le téléphone de l'établissement quand on l'a vérifié.", icon: "M12 3l2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5z" },
  { tag: "04", title: "Email avant 8h", desc: "Les reprises prêtes à appeler, dans votre boîte mail.", icon: "M3 6h18v12H3z M3 7l9 6 9-6" },
];
const TIMELINE = [
  { when: "Exemple · la vente", title: "Le rachat est signé chez le notaire", body: "Un restaurateur reprend « Le Petit Zinc » à Lyon. Quelques jours plus tard, la cession est publiée au Journal officiel : c'est une obligation légale, personne n'y échappe." },
  { when: "Le jour de la publication · avant 8h", title: "Le nom du repreneur est dans votre email", body: "Parmi les milliers d'annonces publiées ce matin-là au BODACC, on a isolé celles de votre métier et de votre zone, identifié le repreneur et cherché son numéro." },
  { when: "Le même jour · 9h15", title: "Vous êtes le premier à appeler", body: "« Félicitations pour la reprise ! » Le repreneur a mille choses à acheter et zéro fournisseur attitré. Le premier qui appelle prend une longueur d'avance." },
];
const EMAIL_STEPS = [
  { n: "1", title: "Détecté cette nuit", desc: "au Journal officiel, trié pour votre métier et votre zone" },
  { n: "2", title: "Repreneur identifié", desc: "nom, société, adresse de l'établissement repris" },
  { n: "3", title: "Numéro vérifié", desc: "quand on le trouve, un tap suffit" },
];
const METIERS = [
  { title: "Agenceurs & aménagement", body: "Le repreneur refait la salle, la terrasse, le bar. Il cherche un agenceur dans les premières semaines, pas dans un an.", icon: "M3 3h18v18H3z M3 9h18 M9 21V9" },
  { title: "Matériel de cuisine pro", body: "Fours, frigos, hottes, plonge : un rachat s'accompagne presque toujours d'un renouvellement d'équipement.", icon: "M6 3v8 M6 11a3 3 0 0 0 3 3v7 M18 3c-2 1-3 3-3 6s1 4 3 4v8" },
  { title: "Caisse & encaissement", body: "Nouvelle société, nouveau contrat de caisse. C'est le moment exact où il compare les offres.", icon: "M4 4h16v6H4z M4 10v10h16V10 M7 14h2 M11 14h2 M15 14h2 M7 18h2 M11 18h2 M15 18h2" },
  { title: "Enseignes & signalétique", body: "Changement de nom, nouvelle identité visuelle : l'enseigne est l'un des premiers postes de dépense d'une reprise.", icon: "M4 5h16v10H4z M12 15v6 M8 21h8" },
  { title: "Brasseurs & boissons", body: "Les contrats de bière, café, boissons sont renégociés à chaque reprise. Le premier qui appelle signe souvent.", icon: "M7 4h9v16H7z M16 8h3v6h-3 M7 9h9" },
  { title: "Assurance & services pro", body: "Multirisque, prévoyance, mutuelle, banque, télécom : tout est à remettre à plat dans les 90 jours.", icon: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" },
];
const WHY = [
  { n: "01", title: "Son dossier de financement tient", body: "Pour racheter un fonds, il a réuni un financement : banque ou apport personnel. Ce n'est pas un projet sur papier." },
  { n: "02", title: "Il vient d'investir, il a du budget", body: "Il a mis de l'argent sur la table pour reprendre. Il en remettra pour équiper, rénover, relancer. La fenêtre d'achat est ouverte." },
  { n: "03", title: "Tous ses contrats sont à renégocier", body: "Fournisseurs, banque, assurance, télécom, caisse : le repreneur remet tout à plat dans les 90 jours. Vous arrivez au bon moment, pas trop tard." },
];
const BODACC = [
  "Une raison sociale et une adresse, noyées dans des dizaines de pages de jargon juridique",
  "Aucun tri par métier ni par zone : tout est mélangé, partout en France",
  "Aucun numéro de téléphone",
  "Aucun nom de dirigeant, aucune fiche entreprise",
  "Aucun signal pour savoir si le repreneur vient de s'installer ou s'il est déjà en activité",
];
const LBP = [
  "Les reprises de votre métier, dans votre zone, le jour de la publication, avant 8h",
  "Le repreneur identifié : société, dirigeant, adresse de l'établissement",
  "Le numéro de téléphone quand on l'a vérifié, prêt à composer",
  "Un badge « société de moins de 6 mois » pour savoir qui appeler en premier",
  "Le lien vers l'annonce officielle, pour vérifier chaque reprise",
];
const FEAT = {
  departement: ["1 département au choix", "Email chaque matin avant 8h", "Nom, société et adresse du repreneur", "Numéro de l'établissement, quand il est vérifié"],
  region: ["1 région complète", "Toutes les verticales de votre métier", "Export CSV pour votre CRM", "Support prioritaire"],
  national: ["France entière ou multi-régions", "Chaque commercial reçoit les reprises de son secteur", "Export CSV & intégration CRM", "Interlocuteur dédié"],
};
const faq = (parMois) => [
  { q: "D'où viennent les données ?", a: "Du BODACC, le Bulletin officiel des annonces civiles et commerciales. Chaque cession de fonds de commerce y est publiée par obligation légale. Nous ne faisons que la détecter, la trier par métier et par zone, et l'enrichir avec l'identité du repreneur et, quand on le trouve et qu'on le vérifie, le téléphone de l'établissement. Chaque ligne reste vérifiable publiquement, gratuitement, pour toujours." },
  { q: "Pourquoi payer, si le BODACC est public ?", a: "Parce que le BODACC est public, mais pas exploitable. Ce que vous achetez, ce n'est pas l'accès à l'information : c'est la fiche prête à appeler, le matin même de la publication, avant votre concurrent. Un repreneur choisit ses fournisseurs dans les 90 jours. Appeler le jour de la publication plutôt que des semaines après, c'est toute la différence entre signer et arriver après." },
  { q: "Comment démarcher ces repreneurs dans les règles ?", a: "Les reprises viennent d'annonces officielles, publiées au BODACC. Entre professionnels, la règle est simple : présentez-vous clairement, proposez une offre en rapport avec l'activité du repreneur, et respectez sa demande s'il ne souhaite plus être contacté. Le démarchage reste sous votre responsabilité, comme tout démarchage commercial." },
  { q: "Combien de reprises vais-je recevoir chaque jour ?", a: `Ça dépend de votre zone et de votre métier. Pour les restaurants, bars et hôtels, environ ${fmt(Math.round(parMois / 10) * 10)} reprises sont publiées chaque mois en France. Dans la moitié des départements de métropole, c'est plus de 6 par mois ; à Paris, plus de 70 ; dans les plus ruraux, moins de 2. La carte ci-dessus vous montre le volume réel de votre département.` },
  { q: "Sans engagement, ça veut dire quoi concrètement ?", a: "Vous payez mois par mois et vous pouvez résilier en un clic depuis votre espace client, sans préavis ni justification. Si vous préférez vous engager sur 6 ou 12 mois, un ou deux mois vous sont offerts en échange." },
];

export default async function Home() {
  const [chr, flux] = await Promise.all([getChiffresChr(), getFlux()]);
  const ex = EXEMPLE;

  return (
    <div className="h-page">
      <Reveal />

      {/* ============ HERO ============ */}
      <section className="h-hero h-dots">
        <div className="h-wrap h-nav">
          <a href="/" className="h-logo"><Logo />LeBonProspect</a>
          <nav className="h-nav-links" aria-label="Navigation principale">
            <a href="#comment">Comment ça marche</a>
            <a href="#exemple">Exemple d&apos;email</a>
            <a href="#pour-qui">Pour qui</a>
            <a href="/reprises">Reprises par région</a>
            <a href="#tarifs">Tarifs</a>
            <a href="#faq">FAQ</a>
          </nav>
          <a href="#zone" className="h-nav-cta">Voir ma zone</a>
        </div>

        <div className="h-wrap h-hero-grid">
          <div className="h-hero-l">
            <div className="h-pill"><span className="h-dot" aria-hidden="true" />Chaque reprise est un acte officiel, vérifiable, jamais inventé</div>
            <h1 className="h-h1"><span className="soft">{fmt(chr.chrParMois)}</span> restaurants, bars et hôtels changent de mains chaque mois. Appelez le repreneur <span className="soft">le jour de la publication.</span></h1>
            <p className="h-hero-sub">Chaque matin avant 8h, recevez ceux de votre métier et de votre zone, avec le nom du repreneur <strong>et son numéro quand on l&apos;a vérifié</strong>.</p>
            <div className="h-ctas">
              <a href="#zone" className="h-btn h-btn-lg">Voir les reprises de ma zone <Fleche /></a>
              <a href="#feed" className="h-btn-outline">Voir les dernières publiées {flux && <span className="h-date">{dateCourte(flux.date)}</span>}</a>
            </div>
            <div className="h-chips">
              <div><b>Avant 8h</b><span>le matin même de la publication</span></div>
              <div><b>{TARIFS.departement.prix} €</b><span>par mois pour un département</span></div>
              <a href="#calculateur" className="h-chip-link"><b>Votre point mort</b><span>calculez-le avec vos chiffres</span></a>
            </div>
            <p className="h-hero-note">Sans engagement · Données 100 % officielles · Aucun lead revendu</p>
          </div>

          <div className="h-hero-r">
            <div className="h-console">
              <div className="h-console-top">
                <span><span className="h-dot" aria-hidden="true" />Exemple d&apos;édition · {dateNum(ex.date)}</span>
                <span className="soft">avant 8h</span>
              </div>
              <div className="h-console-body">
                <div>
                  <div className="h-console-t">{ex.nZone} reprises dans la zone</div>
                  <div className="h-console-s">{ex.zone} · {ex.metier}</div>
                </div>
                {ex.rows.map((r) => (
                  <div key={r.place} className="h-crow">
                    <div className="h-ini" aria-hidden="true">{r.name[0]}</div>
                    <div className="h-crow-m">
                      <div><b>{r.name}</b><span className={`${badgeCls(r.badge)} dark`}>{r.badge}</span></div>
                      <span>{r.place} · repreneur identifié</span>
                      {r.annonce && <a className="h-annonce" href={r.annonce} target="_blank" rel="noopener noreferrer">Voir l&apos;annonce officielle</a>}
                    </div>
                    <span className="h-tel"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></svg>{r.phone}</span>
                  </div>
                ))}
                <div className="h-console-more">+ {ex.nZone - ex.rows.length} autres reprises ce jour-là dans la zone</div>
              </div>
            </div>
            <div className="h-delay">
              <div className="h-mono-l">Votre matin</div>
              <p className="h-delay-txt"><b>Publication au Journal officiel</b> dans la nuit, <b>email dans votre boîte</b> le jour même, avant 8h. Chaque reprise renvoie à son annonce officielle.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ COMMENT ÇA MARCHE ============ */}
      <section id="comment" className="h-sec h-comment" data-reveal>
        <div className="h-wrap">
          <p className="h-eyebrow">Comment ça marche</p>
          <h2 className="h-h2">De la signature chez le notaire à votre premier appel</h2>
          <p className="h-lead">Un pipeline qui tourne sans vous, de la publication légale jusqu&apos;à votre boîte mail.</p>
          <div className="h-flow">
            {FLOW.map((n, i) => (
              <div key={n.tag} className="h-flow-cell">
                <div className="h-flow-card">
                  <div className="h-flow-top">
                    <span className="h-flow-ico"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7CC3C6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={n.icon} /></svg></span>
                    <span className="h-mono">{n.tag}</span>
                  </div>
                  <h3>{n.title}</h3>
                  <p>{n.desc}</p>
                </div>
                {i < FLOW.length - 1 && <svg className="h-hide-m h-arrow" aria-hidden="true" width="28" height="28" viewBox="0 0 28 28"><path d="M5 14h16M15 8l6 6-6 6" fill="none" stroke="#31777A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </div>
            ))}
          </div>
          <div className="h-cards3">
            {TIMELINE.map((t) => (
              <div key={t.when} className="h-card">
                <span className="h-tag">{t.when}</span>
                <h3>{t.title}</h3>
                <p>{t.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CARTE + CALCULATEUR ============ */}
      <ZoneMap chrParMois={chr.chrParMois} />
      <Calculateur />

      {/* ============ EXEMPLE D'EMAIL ============ */}
      <section id="exemple" className="h-sec" data-reveal>
        <div className="h-wrap h-split">
          <div className="h-split-l">
            <p className="h-eyebrow">Exemple d&apos;email</p>
            <h2 className="h-h2">Voici votre matin, avant 8h</h2>
            <p className="h-lead">Pas de dashboard à ouvrir, pas de logiciel à apprendre. Un email, des reprises, des numéros. Vous lisez, vous appelez.</p>
            <div className="h-steps">
              {EMAIL_STEPS.map((e) => (
                <div key={e.n}><span className="h-step-n">{e.n}</span><div><b>{e.title}</b><span>{e.desc}</span></div></div>
              ))}
            </div>
          </div>
          <div className="h-split-r">
            <div className="h-mail">
              <div className="h-mail-top">
                <svg aria-hidden="true" width="32" height="32" viewBox="0 0 28 28"><rect width="28" height="28" rx="8" fill="#0B1020" /><path d="M8 14.5l4 4 8-9" fill="none" stroke="#7CC3C6" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <div><b>LeBonProspect</b><span>{ex.nZone} reprises de commerces · votre zone</span></div>
                <span className="h-mono">exemple</span>
              </div>
              <div className="h-mail-body">
                <span className="h-badge">{ex.nZone} reprises · {ex.zone}</span>
                <h3>{ex.nZone} commerces viennent de changer de mains</h3>
                <p className="h-mail-sub">{ex.metier} · publiés au Journal officiel le {dateLongue(ex.date)}</p>
                {ex.rows.map((r) => (
                  <div key={r.place} className="h-mail-row">
                    <div>
                      <div><b>{r.name}</b><span className={badgeCls(r.badge)}>{r.badge}</span></div>
                      <span className="m">{r.place}</span>
                      <span className="o">Repreneur : <strong>nom et société en clair dans l&apos;email</strong></span>
                      {r.annonce && <a className="h-annonce" href={r.annonce} target="_blank" rel="noopener noreferrer">Voir l&apos;annonce officielle</a>}
                    </div>
                    <span className="h-tel dark">{r.phone}</span>
                  </div>
                ))}
                <p className="h-mail-more">+ {ex.nZone - ex.rows.length} autres reprises dans cette édition</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FLUX EN DIRECT ============ */}
      <section id="feed" className="h-sec h-white" data-reveal>
        <div className="h-wrap">
          <p className="h-eyebrow">En direct du Journal officiel</p>
          <h2 className="h-h2">Publiées {flux ? `le ${dateLongue(flux.date)}` : "récemment"}</h2>
          <p className="h-lead wide">Annonces réelles, mises à jour automatiquement : chaque ligne est vérifiable publiquement au BODACC, gratuitement, pour toujours. Un badge indique si le repreneur vient tout juste de s&apos;installer ou s&apos;il est déjà en activité, pour prioriser vos appels.</p>
          {flux && (
            <div className="h-feed">
              <div className="h-feed-top">
                <span><span className="h-dot" aria-hidden="true" /><b>Flux quotidien</b></span>
                <span className="h-mono">édition du {dateNum(flux.date)}</span>
              </div>
              <div className="h-feed-scroll">
                <div className="h-feed-inner">
                  <div className="h-feed-head"><div className="c1">Établissement</div><div className="c2">Zone</div><div className="c3">Repreneur</div><div className="c4">Téléphone</div><div className="c5">Signal</div></div>
                  {flux.items.map((r) => (
                    <div key={r.id} className="h-feed-row">
                      <div className="c1"><b>{r.nom}</b>{r.annonce && <a className="h-annonce" href={r.annonce} target="_blank" rel="noopener noreferrer">annonce officielle</a>}</div>
                      <div className="c2 m">{r.commune} · {r.dep}</div>
                      <div className="c3"><span className="h-lockline"><svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 11V8a5 5 0 0 1 10 0v3 M5 11h14v10H5z" /></svg>identifié</span></div>
                      <div className="c4"><span className="h-lockline">{r.numero ? "vérifié, réservé aux abonnés" : "en recherche"}</span></div>
                      <div className="c5">{r.badge && <span className={badgeCls(r.badge)}>{r.badge}</span>}</div>
                    </div>
                  ))}
                  <div className="h-feed-lock">
                    <div aria-hidden="true" className="h-skel">
                      {[["70%", "60%", "65%", "75%"], ["55%", "70%", "50%", "70%"], ["65%", "50%", "60%", "80%"]].map((k, i) => (
                        <div key={i} className="h-skel-row">{k.map((w, j) => <div key={j} className={`c${j + 1}`}><i style={{ width: w }} /></div>)}<div className="c5"><i className="pill" /></div></div>
                      ))}
                    </div>
                    <div className="h-feed-veil">
                      <div><span><strong>Les autres reprises du jour</strong>, avec le repreneur et son numéro, sont réservées aux abonnés</span><a href="#tarifs" className="h-btn">Débloquer le flux complet →</a></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <p className="h-after">Envie de vérifier une annonce ? Chacune reste consultable au Journal officiel. Ce que vous ne trouverez pas là-bas : le tri par métier, l&apos;identité complète du repreneur, sa fiche entreprise. Ça, c&apos;est notre travail.</p>
        </div>
      </section>

      {/* ============ POUR QUI ============ */}
      <section id="pour-qui" className="h-sec" data-reveal>
        <div className="h-wrap">
          <p className="h-eyebrow">Pour qui</p>
          <h2 className="h-h2">Si vous équipez des cafés, bars, restaurants ou hôtels, c&apos;est pour vous</h2>
          <p className="h-lead">Six métiers pour qui une reprise est le meilleur moment pour signer un nouveau client.</p>
          <div className="h-grid3">
            {METIERS.map((m) => (
              <div key={m.title} className="h-card">
                <span className="h-card-ico"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#31777A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={m.icon} /></svg></span>
                <h3>{m.title}</h3>
                <p>{m.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ POURQUOI LE REPRENEUR ============ */}
      <section className="h-sec h-dark" data-reveal>
        <div className="h-wrap">
          <p className="h-eyebrow soft">Pourquoi le repreneur</p>
          <h2 className="h-h2 w">Un repreneur, ce n&apos;est pas une création d&apos;entreprise</h2>
          <p className="h-lead d">Les annuaires de créations vous envoient vers des coquilles vides. Une reprise, c&apos;est l&apos;inverse.</p>
          <div className="h-grid3">
            {WHY.map((w) => (
              <div key={w.n} className="h-card dark"><div className="h-why-n">{w.n}</div><h3>{w.title}</h3><p>{w.body}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ BODACC VS LBP ============ */}
      <section className="h-sec" data-reveal>
        <div className="h-wrap">
          <p className="h-eyebrow">La question que tout le monde se pose</p>
          <h2 className="h-h2">Oui, le BODACC est public. Ce n&apos;est pas ce que vous achetez.</h2>
          <p className="h-lead">Ce que contient le Journal officiel, et ce que vous recevez avant 8h.</p>
          <div className="h-vs">
            <div className="h-vs-col">
              <div className="h-mono-l">Ce que le BODACC contient</div>
              <ul>{BODACC.map((t) => <li key={t}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" className="h-ico"><path d="M4.5 4.5l9 9M13.5 4.5l-9 9" fill="none" stroke="#8B93A7" strokeWidth="2" strokeLinecap="round" /></svg><span>{t}</span></li>)}</ul>
              <div className="h-vs-foot">Public, oui. Exploitable, non.</div>
            </div>
            <div className="h-vs-col dark">
              <div className="h-mono-l soft">Ce que vous recevez avant 8h</div>
              <ul>{LBP.map((t) => <li key={t}><Coche /><span>{t}</span></li>)}</ul>
              <a href="#calculateur" className="h-vs-foot link">Combien de clients pour rentabiliser ? Faites le calcul avec vos chiffres →</a>
            </div>
          </div>
        </div>
      </section>

      {/* ============ TARIFS ============ */}
      <section id="tarifs" className="h-sec h-white" data-reveal>
        <div className="h-wrap">
          <p className="h-eyebrow">Tarifs</p>
          <h2 className="h-h2 mb">Choisissez votre terrain de chasse</h2>
          <div className="h-plans">
            <div className="h-plan">
              <div className="h-plan-t">{TARIFS.departement.label}</div>
              <div className="h-plan-p"><b>{TARIFS.departement.prix} €</b><span>/mois</span></div>
              <div className="h-plan-s">un département au choix, sans engagement</div>
              <ul>{FEAT.departement.map((t) => <li key={t}><Coche c="#31777A" /><span>{t}</span></li>)}</ul>
              <a href={TARIFS.departement.stripe} className="h-plan-btn">Surveiller mon département</a>
            </div>
            <div className="h-plan dark">
              <div className="h-plan-t"><span>{TARIFS.region.label}</span></div>
              <div className="h-plan-p"><b>{TARIFS.region.prix} €</b><span>/mois</span></div>
              <div className="h-plan-s">tous les départements de votre région</div>
              <ul>{FEAT.region.map((t) => <li key={t}><Coche /><span>{t}</span></li>)}</ul>
              <a href={TARIFS.region.stripe} className="h-plan-btn fill">Prendre ma région</a>
            </div>
            <div className="h-plan">
              <div className="h-plan-t">{TARIFS.national.label}</div>
              <div className="h-plan-p devis"><b>Sur devis</b></div>
              <div className="h-plan-s">multi-régions, équipes commerciales, national</div>
              <ul>{FEAT.national.map((t) => <li key={t}><Coche c="#31777A" /><span>{t}</span></li>)}</ul>
              <a href={TARIFS.national.mailto} className="h-plan-btn">Parler à un humain</a>
            </div>
          </div>
          <div className="h-engage">Sans engagement, résiliable en 1 clic · engagement 6 mois : <strong>1 mois offert</strong> · engagement 12 mois : <strong>2 mois offerts</strong></div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" className="h-sec" data-reveal>
        <div className="h-wrap narrow">
          <p className="h-eyebrow">Questions fréquentes</p>
          <h2 className="h-h2 mb">Tout ce qu&apos;on nous demande avant de s&apos;abonner</h2>
          <div className="h-faq">
            {faq(chr.chrParMois).map((q) => (
              <details key={q.q}>
                <summary><span>{q.q}</span><svg className="h-faq-plus" aria-hidden="true" width="22" height="22" viewBox="0 0 22 22"><path d="M11 4v14M4 11h14" fill="none" stroke="#0B1020" strokeWidth="2" strokeLinecap="round" /></svg></summary>
                <p>{q.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ============ APPEL FINAL ============ */}
      <section className="h-final-wrap">
        <div className="h-final h-dots">
          <h2>Demain matin, avant 8h, les reprises de votre zone seront dans votre boîte mail.</h2>
          <p>Le premier fournisseur qui appelle prend une longueur d&apos;avance. Autant que ce soit vous.</p>
          <a href="#zone" className="h-btn h-btn-lg">Voir les reprises de ma zone <Fleche /></a>
          <div className="h-final-note">Sans engagement · Résiliable en 1 clic · Données 100 % officielles</div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="h-foot h-dots">
        <div className="h-wrap">
          <div className="h-foot-top">
            <div className="h-foot-brand">
              <a href="/" className="h-logo"><Logo />LeBonProspect</a>
              <p>Les reprises de commerces publiées au BODACC, avec le nom du repreneur, l&apos;adresse et le téléphone quand il est vérifié, dans votre boîte mail avant 8h.</p>
              <a href="#zone" className="h-btn">Voir les reprises de ma zone <Fleche /></a>
            </div>
            <div className="h-foot-cols">
              <div><div className="h-mono-l">Produit</div><a href="#comment">Comment ça marche</a><a href="#zone">Choisir ma zone</a><a href="#calculateur">Calculateur</a><a href="#exemple">Exemple d&apos;email</a><a href="#tarifs">Tarifs</a></div>
              <div><div className="h-mono-l">Ressources</div><a href="/reprises">Reprises par région</a><a href="#pour-qui">Pour qui</a><a href="#faq">FAQ</a><a href="mailto:contact@lebonprospect.fr">Contact</a></div>
              <div><div className="h-mono-l">Légal</div><a href="/mentions-legales">Mentions légales</a><a href="/cgv">CGV</a><a href="/confidentialite">Confidentialité</a></div>
            </div>
          </div>
          <div className="h-foot-bot">
            <span>© 2026 LeBonProspect. Tous droits réservés.</span>
            <span>Données publiques BODACC, réutilisées sous licence ouverte. Contours des départements : svg-maps, Victor Cazanave (CC BY 4.0).</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
