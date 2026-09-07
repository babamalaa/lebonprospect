const Mark = () => (
  <span className="mark">
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M2 13 L7 5 L11 10 L16 3" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="3" r="2.2" fill="#d64a2e" />
    </svg>
  </span>
);

export default function Home() {
  return (
    <>
      <header>
        <div className="wrap nav">
          <a className="logo" href="/">
            <Mark />
            LeBonProspect
          </a>
          <nav className="links">
            <a href="#feed">Publiées hier</a>
            <a href="#tarifs">Tarifs</a>
            <a className="btn inv" style={{ marginLeft: 24, padding: "10px 20px", fontSize: 13.5 }} href="#tarifs">
              Voir ma zone
            </a>
          </nav>
        </div>
      </header>

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
          <a className="btn inv" href="#feed">Publiées hier au Journal officiel</a>
        </div>
        <div className="small-note">Sans engagement · Données 100 % officielles · Aucun lead revendu</div>
        <div className="proof">
          <div>
            <div className="n">3 950</div>
            <div className="l">cessions publiées chaque mois en France</div>
          </div>
          <div>
            <div className="n">47 768</div>
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

      <section className="story wrap">
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

      <section className="feed-sec wrap" id="feed">
        <h2 className="disp">Publiées hier au Journal officiel</h2>
        <p className="center-sub">
          Annonces réelles du 6 septembre 2026 : chaque ligne est vérifiable publiquement au BODACC, gratuitement,
          pour toujours.
        </p>
        <div className="feed">
          <div className="feed-head">
            <span className="live">
              <span className="dot" />
              Flux quotidien
            </span>
            <span className="mono" style={{ fontSize: 12 }}>édition du 06/09/2026</span>
          </div>
          <div className="row">
            <div className="date">06/09<br />Paris 5e</div>
            <div className="what">
              <b>LE PIANO VACHE</b> reprend le bar Le Piano Vache, rue Laplace
              <br />
              <span className="meta">Repreneur identifié · ☎ 01 46 33 ██ ██ · Paris 5e</span>
            </div>
            <span className="tag">75 · Île-de-France</span>
          </div>
          <div className="row">
            <div className="date">06/09<br />Bordeaux</div>
            <div className="what">
              <b>DOLCE VITA</b> reprend un restaurant rue du Pas Saint-Georges
              <br />
              <span className="meta">Repreneur identifié · ☎ 06 46 68 ██ ██ · Bordeaux centre</span>
            </div>
            <span className="tag">33 · Nouvelle-Aquitaine</span>
          </div>
          <div className="row">
            <div className="date">06/09<br />Ploërmel</div>
            <div className="what">
              <b>LA HALTE CELTIQUE</b> reprend un fonds rue des Primevères
              <br />
              <span className="meta">Repreneur identifié · ☎ 06 41 88 ██ ██ · Morbihan</span>
            </div>
            <span className="tag">56 · Bretagne</span>
          </div>
          <div className="row blurred">
            <div className="date">06/09<br />Annecy</div>
            <div className="what">
              <b>████████</b> reprend un restaurant place des Rhododendrons
              <br />
              <span className="meta">Détails réservés aux abonnés</span>
            </div>
            <span className="tag">74 · AURA</span>
          </div>
          <div className="row blurred">
            <div className="date">06/09<br />Marseille</div>
            <div className="what">
              <b>████████</b> reprend un restaurant rue Marengo
              <br />
              <span className="meta">Détails réservés aux abonnés</span>
            </div>
            <span className="tag">13 · PACA</span>
          </div>
          <div className="feed-foot">
            108 autres cessions publiées le même jour partout en France.{" "}
            <a href="#tarifs">débloquer le flux complet →</a>
          </div>
        </div>
        <p className="verify">
          Envie de vérifier une annonce ? Chacune reste consultable au Journal officiel. Ce que vous ne trouverez
          pas là-bas : le tri par métier, l&apos;identité complète du repreneur, sa fiche entreprise. Ça, c&apos;est
          notre travail.
        </p>
      </section>

      <section className="proof-sec">
        <div className="wrap">
          <h2 className="disp">Le gisement est officiel, énorme, et personne ne le regarde</h2>
          <div className="nums">
            <div className="num-card">
              <div className="n">3 950</div>
              <div className="l">commerces changent de mains chaque mois</div>
            </div>
            <div className="num-card">
              <div className="n">90 j</div>
              <div className="l">de fenêtre d&apos;achat après la reprise</div>
            </div>
            <div className="num-card">
              <div className="n">24 h</div>
              <div className="l">entre la publication et votre email</div>
            </div>
            <div className="num-card">
              <div className="n">1 seul</div>
              <div className="l">client signé rembourse 2 ans d&apos;abonnement</div>
            </div>
          </div>
        </div>
      </section>

      <section className="pricing wrap" id="tarifs">
        <h2 className="disp">Choisissez votre terrain de chasse</h2>
        <div className="plans">
          <div className="plan">
            <h3>Mon département</h3>
            <div className="price">
              149 € <small>/mois</small>
            </div>
            <div className="vol">~15-40 reprises / mois selon dept</div>
            <ul>
              <li>1 département au choix</li>
              <li>Email chaque matin à 8h</li>
              <li>Nom, société et adresse du repreneur</li>
              <li>Numéro de téléphone de l&apos;établissement</li>
            </ul>
            <a className="btn inv" href="https://buy.stripe.com/fZu28recd6SP3r57Bu7bW07">C&apos;est parti</a>
          </div>
          <div className="plan mid">
            <span className="tag2">Le plus choisi</span>
            <h3>Ma région</h3>
            <div className="price">
              299 € <small>/mois</small>
            </div>
            <div className="vol">jusqu&apos;à 180 reprises resto / mois en IDF</div>
            <ul>
              <li>1 région complète</li>
              <li>Toutes les verticales de votre métier</li>
              <li>Export CSV pour votre CRM</li>
              <li>Support prioritaire</li>
            </ul>
            <a className="btn" href="https://buy.stripe.com/28EfZh4BDdhdf9NaNG7bW08">C&apos;est parti</a>
          </div>
          <div className="plan">
            <h3>Toute la France</h3>
            <div className="price">
              499 € <small>/mois</small>
            </div>
            <div className="vol">~820 reprises resto / mois · 0,70 € le prospect</div>
            <ul>
              <li>France entière, votre secteur</li>
              <li>Prospect nominatif à moins de 0,70 €</li>
              <li>API &amp; intégration CRM</li>
            </ul>
            <a className="btn inv" href="https://buy.stripe.com/3cI6oHd89fplf9Nf3W7bW09">C&apos;est parti</a>
          </div>
        </div>
        <p className="engage">
          Sans engagement · 6 mois : <b>1 mois offert</b> · 12 mois : <b>2 mois offerts</b>
        </p>
      </section>

      <footer>
        <div className="wrap">
          <span>© 2026 LeBonProspect · données publiques BODACC (licence ouverte)</span>
          <span>Mentions légales · CGV · Contact</span>
        </div>
      </footer>
    </>
  );
}
