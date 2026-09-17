import Header from "./components/Header";
import PhoneDemo from "./components/PhoneDemo";
import Reveal from "./components/Reveal";
import FaqAccordion from "./components/FaqAccordion";
import { getLiveFeed, getLiveStats, formatDateFr, formatDateShort } from "./lib/landingData";

export const revalidate = 3600; // le feed et les chiffres se rafraîchissent toutes les heures

const fmt = (n) => n.toLocaleString("fr-FR");

const ICON = {
  agencement: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" /></svg>
  ),
  cuisine: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11h16M6 11v9h12v-9M8 11V6a4 4 0 0 1 8 0v5" /></svg>
  ),
  caisse: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M7 20h10M12 16v4M7 8h4M7 12h10" /></svg>
  ),
  enseigne: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16v9H4zM12 15v5M8 20h8" /><path d="M8 10h8" /></svg>
  ),
  boissons: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3h8l-1 9a3 3 0 0 1-6 0zM12 15v6M9 21h6" /></svg>
  ),
  assurance: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" /><path d="m9 12 2 2 4-4" /></svg>
  ),
};

const CIBLES = [
  { icon: "agencement", t: "Agenceurs & aménagement", d: "Le repreneur refait la salle, la terrasse, le bar. Il cherche un agenceur dans les premières semaines, pas dans un an." },
  { icon: "cuisine", t: "Matériel de cuisine pro", d: "Fours, frigos, hottes, plonge : un rachat s'accompagne presque toujours d'un renouvellement d'équipement." },
  { icon: "caisse", t: "Caisse & encaissement", d: "Nouvelle société, nouveau contrat de caisse. C'est le moment exact où il compare les offres." },
  { icon: "enseigne", t: "Enseignes & signalétique", d: "Changement de nom, nouvelle identité visuelle : l'enseigne est l'un des premiers postes de dépense d'une reprise." },
  { icon: "boissons", t: "Brasseurs & boissons", d: "Les contrats de bière, café, boissons sont renégociés à chaque reprise. Le premier qui appelle signe souvent." },
  { icon: "assurance", t: "Assurance & services pro", d: "Multirisque, prévoyance, mutuelle, banque, télécom : tout est à remettre à plat dans les 90 jours." },
];

export default async function Home() {
  const [feed, stats] = await Promise.all([getLiveFeed(), getLiveStats()]);
  const visible = feed ? feed.items.slice(0, 3) : [];
  const blurred = feed ? feed.items.slice(3, 5) : [];
  const nbOthers = feed ? Math.max(0, feed.nbSameDayAll - visible.length - blurred.length) : 0;

  return (
    <>
      <Reveal />
      <Header />

      {/* 1. HERO */}
      <section className="hero wrap">
        <div className="stamp">
          <span className="dot" />
          Chaque reprise est un acte officiel, vérifiable, jamais inventé
        </div>
        <h1>
          Quelqu&apos;un vient de racheter <span className="hl">un commerce près de chez vous.</span>
          <br />
          Il a besoin de vous. Maintenant.
        </h1>
        <p className="sub">
          Nouvelle enseigne, travaux, matériel, caisse, contrats… Un repreneur refait tout dans les 90 jours.
          LeBonProspect vous donne son nom, son adresse <b>et le numéro où l&apos;appeler</b> dès la publication
          officielle. À vous de décrocher le téléphone.
        </p>
        <div className="cta-row">
          <a className="btn" href="#tarifs">Voir les reprises de ma zone</a>
          <a className="btn inv" href="#feed">
            Voir les dernières publiées
            {feed && <span className="btn-date">{formatDateShort(feed.date)}</span>}
          </a>
        </div>
        <div className="small-note">Sans engagement · Données 100 % officielles · Aucun lead revendu</div>
      </section>

      {/* 2. SCÉNARIO */}
      <section className="story wrap" id="comment" data-reveal>
        <div className="sec-head">
          <span className="eyebrow">Comment ça marche</span>
          <h2 className="disp">De la signature chez le notaire à votre premier appel</h2>
        </div>
        <div className="story-grid">
          <div className="story-cell">
            <div className="day">Lundi · jour J</div>
            <h3>Le rachat est signé chez le notaire</h3>
            <p>
              Un restaurateur reprend « Le Petit Zinc » à Lyon. La cession est publiée au Journal officiel :
              c&apos;est une obligation légale, personne n&apos;y échappe.
            </p>
          </div>
          <div className="story-cell mid">
            <div className="day">Mardi · 8h00</div>
            <h3>Le nom du repreneur est dans votre email</h3>
            <p>
              Sur les 89 pages de jargon juridique publiées ce matin-là, 3 reprises concernent votre métier et
              votre zone. On les a trouvées, identifiées, enrichies : société, dirigeant, adresse, et le téléphone
              de l&apos;établissement.
            </p>
          </div>
          <div className="story-cell">
            <div className="day">Mardi · 9h15</div>
            <h3>Vous êtes le premier à appeler</h3>
            <p>
              « Félicitations pour la reprise ! » Le repreneur a mille choses à acheter et zéro fournisseur
              attitré. Le premier qui appelle prend une longueur d&apos;avance.
            </p>
          </div>
        </div>
      </section>

      {/* 3. CHIFFRES LIVE */}
      <section className="proof-band" data-reveal>
        <div className="wrap proof">
          <div>
            <div className="n">{fmt(stats.perMonth)}</div>
            <div className="l">cessions publiées chaque mois en France</div>
          </div>
          <div>
            <div className="n">{fmt(stats.last12Months)}</div>
            <div className="l">sur les 12 derniers mois</div>
          </div>
          <div>
            <div className="n">24 h</div>
            <div className="l">entre la publication et votre email</div>
          </div>
          <div>
            <div className="n accent">0</div>
            <div className="l">donnée inventée : tout est vérifiable au BODACC</div>
          </div>
        </div>
      </section>

      {/* 4. EMAIL DÉMO */}
      <div id="exemple">
        <PhoneDemo />
      </div>

      {/* 5. FEED LIVE */}
      <section className="feed-sec wrap" id="feed" data-reveal>
        <div className="sec-head">
          <span className="eyebrow">En direct du Journal officiel</span>
          <h2 className="disp">Publiées {feed ? `le ${formatDateFr(feed.date)}` : "récemment"}</h2>
          <p className="center-sub">
            Annonces réelles, mises à jour automatiquement : chaque ligne est vérifiable publiquement au BODACC,
            gratuitement, pour toujours. Un badge indique si le repreneur vient tout juste de s&apos;installer ou
            s&apos;il est déjà en activité, pour prioriser vos appels.
          </p>
        </div>
        {feed && (
          <div className="feed">
            <div className="feed-head">
              <span className="live">
                <span className="dot" />
                Flux quotidien
              </span>
              <span className="mono" style={{ fontSize: 12 }}>édition du {formatDateShort(feed.date)}/{feed.date.slice(0, 4)}</span>
            </div>
            {visible.map((it) => (
              <div className="row" key={it.id}>
                <div className="date">{formatDateShort(feed.date)}<br />{it.ville}</div>
                <div className="what">
                  <b>{it.acheteur}</b> reprend {it.etablissement ? <>« {it.etablissement} »</> : "un fonds de commerce"}{" "}
                  {it.badge && <span className={`badge-fresh${it.badge === "en expansion" ? " exp" : ""}`}>{it.badge}</span>}
                  <br />
                  <span className="meta">Repreneur identifié · ☎ {it.telMasque} · {it.ville}</span>
                </div>
                <span className="tag">{it.deptCode} · {it.region}</span>
              </div>
            ))}
            {blurred.map((it) => (
              <div className="row blurred" key={it.id}>
                <div className="date">{formatDateShort(feed.date)}<br />{it.ville}</div>
                <div className="what">
                  <b>████████</b> reprend {it.etablissement ? "un établissement" : "un fonds de commerce"} à {it.ville}
                  <br />
                  <span className="meta">Détails réservés aux abonnés</span>
                </div>
                <span className="tag">{it.deptCode} · {it.region}</span>
              </div>
            ))}
            <div className="feed-foot">
              {nbOthers > 0 ? <>{fmt(nbOthers)} autres cessions publiées le même jour partout en France.{" "}</> : <>Toutes les cessions du jour, partout en France.{" "}</>}
              <a href="#tarifs">débloquer le flux complet →</a>
            </div>
          </div>
        )}
        <p className="verify">
          Envie de vérifier une annonce ? Chacune reste consultable au Journal officiel. Ce que vous ne trouverez
          pas là-bas : le tri par métier, l&apos;identité complète du repreneur, sa fiche entreprise. Ça, c&apos;est
          notre travail.
        </p>
      </section>

      {/* 6. POUR QUI */}
      <section className="cibles-sec" id="pour-qui" data-reveal>
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">Pour qui</span>
            <h2 className="disp">Si vous équipez des cafés, bars, restaurants ou hôtels, c&apos;est pour vous</h2>
            <p className="center-sub">Six métiers pour qui une reprise est le meilleur moment pour signer un nouveau client.</p>
          </div>
          <div className="cibles-grid">
            {CIBLES.map((c) => (
              <div className="cible" key={c.t}>
                <span className="cible-ico">{ICON[c.icon]}</span>
                <h3>{c.t}</h3>
                <p>{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. REPRENEUR VS CRÉATEUR */}
      <section className="why-sec wrap" data-reveal>
        <div className="sec-head">
          <span className="eyebrow">Pourquoi le repreneur</span>
          <h2 className="disp">Un repreneur, ce n&apos;est pas une création d&apos;entreprise</h2>
          <p className="center-sub">Les annuaires de créations vous envoient vers des coquilles vides. Une reprise, c&apos;est l&apos;inverse.</p>
        </div>
        <div className="why-grid">
          <div className="why">
            <div className="why-n">01</div>
            <h3>Son dossier de financement tient</h3>
            <p>Pour racheter un fonds, il a convaincu une banque. Le crédit est validé, le capital est là. Ce n&apos;est pas un projet sur papier.</p>
          </div>
          <div className="why">
            <div className="why-n">02</div>
            <h3>Il vient d&apos;investir, il a du budget</h3>
            <p>Il a mis de l&apos;argent sur la table pour reprendre. Il en remettra pour équiper, rénover, relancer. La fenêtre d&apos;achat est ouverte.</p>
          </div>
          <div className="why">
            <div className="why-n">03</div>
            <h3>Tous ses contrats sont à renégocier</h3>
            <p>Fournisseurs, banque, assurance, télécom, caisse : le repreneur remet tout à plat dans les 90 jours. Vous arrivez au bon moment, pas trop tard.</p>
          </div>
        </div>
      </section>

      {/* 8. COMPARAISON */}
      <section className="compare-sec" data-reveal>
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">Faire soi-même ou déléguer</span>
            <h2 className="disp">« C&apos;est public, je peux le faire moi-même »</h2>
            <p className="center-sub">Oui. Voici ce que ça demande, tous les matins.</p>
          </div>
          <div className="compare">
            <div className="compare-col">
              <div className="compare-title">Seul, chaque matin</div>
              <ul>
                <li><span className="x" />Ouvrir le BODACC et lire des dizaines de pages de jargon juridique</li>
                <li><span className="x" />Repérer à la main les cessions qui concernent votre métier et votre zone</li>
                <li><span className="x" />Identifier la société repreneuse, retrouver son dirigeant</li>
                <li><span className="x" />Chercher l&apos;établissement, trouver un numéro de téléphone qui répond</li>
                <li><span className="x" />Recommencer demain. Et après-demain.</li>
              </ul>
              <div className="compare-foot">Environ 1 heure par jour, pour une poignée de contacts.</div>
            </div>
            <div className="compare-col main">
              <div className="compare-title">Avec LeBonProspect</div>
              <ul>
                <li><span className="ok" />Un email à 8h, trié pour votre métier et votre zone</li>
                <li><span className="ok" />Le nom du repreneur, sa société, l&apos;adresse de l&apos;établissement</li>
                <li><span className="ok" />Le numéro de téléphone, prêt à composer</li>
                <li><span className="ok" />Un badge pour savoir qui appeler en premier</li>
                <li><span className="ok" />Vous lisez, vous appelez. C&apos;est tout.</li>
              </ul>
              <div className="compare-foot">Dès 5 € le prospect nominatif, jamais revendu.</div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. TARIFS */}
      <section className="pricing wrap" id="tarifs" data-reveal>
        <div className="sec-head">
          <span className="eyebrow">Tarifs</span>
          <h2 className="disp">Choisissez votre terrain de chasse</h2>
        </div>
        <div className="plans">
          <div className="plan">
            <h3>Mon département</h3>
            <div className="price">
              149 € <small>/mois</small>
            </div>
            <div className="vol">soit environ 5,50 € le prospect nominatif</div>
            <ul>
              <li>1 département au choix</li>
              <li>Email chaque matin à 8h</li>
              <li>Nom, société et adresse du repreneur</li>
              <li>Numéro de téléphone de l&apos;établissement</li>
            </ul>
            <a className="btn inv" href="https://buy.stripe.com/8x26oH2sN1i4gpv0b78N200">Surveiller mon département</a>
          </div>
          <div className="plan mid">
            <span className="tag2">Le plus choisi</span>
            <h3>Ma région</h3>
            <div className="price">
              299 € <small>/mois</small>
            </div>
            <div className="vol">soit environ 3,50 € le prospect nominatif</div>
            <ul>
              <li>1 région complète</li>
              <li>Toutes les verticales de votre métier</li>
              <li>Export CSV pour votre CRM</li>
              <li>Support prioritaire</li>
            </ul>
            <a className="btn" href="https://buy.stripe.com/14A5kD4AVe4Q7SZe1X8N201">Prendre ma région</a>
          </div>
          <div className="plan">
            <h3>Toute la France</h3>
            <div className="price price-devis">Sur devis</div>
            <div className="vol">multi-régions, équipes commerciales, national</div>
            <ul>
              <li>France entière ou multi-régions</li>
              <li>Chaque commercial reçoit les reprises de son secteur</li>
              <li>Export CSV &amp; intégration CRM</li>
              <li>Interlocuteur dédié</li>
            </ul>
            <a className="btn inv" href="mailto:contact@lebonprospect.fr?subject=Offre%20nationale%20LeBonProspect">Parler à un humain</a>
          </div>
        </div>
        <p className="engage">
          Sans engagement, résiliable en 1 clic · engagement 6 mois : <b>1 mois offert</b> · engagement 12 mois : <b>2 mois offerts</b>
        </p>
      </section>

      {/* 10. FAQ */}
      <section className="faq-sec wrap" id="faq" data-reveal>
        <div className="sec-head">
          <span className="eyebrow">Questions fréquentes</span>
          <h2 className="disp">Tout ce qu&apos;on nous demande avant de s&apos;abonner</h2>
        </div>
        <FaqAccordion />
      </section>

      {/* 11. CTA FINAL */}
      <section className="final-cta" data-reveal>
        <div className="wrap">
          <h2>Demain matin à 8h, les reprises de votre zone seront dans votre boîte mail.</h2>
          <p>Le premier fournisseur qui appelle prend une longueur d&apos;avance. Autant que ce soit vous.</p>
          <a className="btn light" href="#tarifs">Voir les reprises de ma zone</a>
          <div className="final-note">Sans engagement · Résiliable en 1 clic · Données 100 % officielles</div>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <span>© 2026 LeBonProspect · données publiques BODACC (licence ouverte)</span>
          <span><a href="/mentions-legales" style={{ color: "inherit" }}>Mentions légales</a> · <a href="/cgv" style={{ color: "inherit" }}>CGV</a> · <a href="mailto:contact@lebonprospect.fr" style={{ color: "inherit" }}>Contact</a></span>
        </div>
      </footer>
    </>
  );
}
