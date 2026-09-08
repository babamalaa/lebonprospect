import teasers from "../../../data/teasers.json";
import PhoneDemo from "../../components/PhoneDemo";

export const dynamicParams = false;

export function generateStaticParams() {
  return teasers.cibles.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }) {
  const c = teasers.cibles.find((x) => x.slug === params.slug);
  return {
    title: c ? `LeBonProspect × ${c.societe}` : "LeBonProspect",
    robots: { index: false, follow: false },
  };
}

const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  const mois = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
  return `${d.getDate()} ${mois[d.getMonth()]}`;
};

export default function TeaserPage({ params }) {
  const cible = teasers.cibles.find((x) => x.slug === params.slug);
  const reg = teasers.regions[cible.region];
  const perLeadRegional = (299 / Math.max(reg.n30, 1)).toFixed(2).replace(".", ",");

  return (
    <main className="tz">
      {/* Bandeau personnalisé */}
      <div className="tz-band">
        <div className="wrap tz-band-in">
          <span className="tz-logo">
            <span className="mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <path d="M2 13 L7 5 L11 10 L16 3" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="16" cy="3" r="2.2" fill="#d64a2e" />
              </svg>
            </span>
            LeBonProspect
          </span>
          <span className="tz-for">préparé pour <b>{cible.societe}</b></span>
        </div>
      </div>

      {/* Hero personnalisé */}
      <section className="hero wrap tz-hero">
        <h1>
          {reg.n90} restaurants, bars et hôtels ont changé de propriétaire{" "}
          <span className="hl">en {cible.region}</span> en 90 jours.
        </h1>
        <p className="sub">
          Chacun de ces repreneurs investit en ce moment dans {cible.metier}. La question n&apos;est pas de savoir
          s&apos;ils vont acheter — c&apos;est de savoir qui les appellera en premier.
        </p>
        <div className="proof tz-proof">
          <div><div className="n">{reg.n90}</div><div className="l">reprises CHR en 90 jours dans votre région</div></div>
          <div><div className="n">{reg.n30}</div><div className="l">sur les 30 derniers jours</div></div>
          <div><div className="n">{reg.pct_tel} %</div><div className="l">livrées avec le téléphone de l&apos;établissement</div></div>
          <div><div className="n">8h00</div><div className="l">dans votre boîte mail, chaque matin</div></div>
        </div>
      </section>

      {/* Dernières reprises réelles de la région */}
      <section className="feed-sec wrap">
        <h2 className="disp">Les dernières, en vrai</h2>
        <p className="center-sub">
          Publiées au Journal officiel ces derniers jours en {cible.region}. Réelles et vérifiables.
        </p>
        <div className="feed">
          <div className="feed-head">
            <span className="live-dot" /> DERNIÈRES REPRISES · {cible.region.toUpperCase()}
          </div>
          {reg.leads.map((l) => (
            <div className="row" key={l.nom + l.ville}>
              <div className="what">
                <b>{l.nom}</b>
                {l.badge && <span className={`tz-badge${l.badge === "en expansion" ? " exp" : ""}`}>{l.badge}</span>}
                <div className="meta">
                  {l.ville} · {l.dept} · publié le {fmtDate(l.date)}
                  {l.dirigeants.length > 0 && <> · repreneur : {l.dirigeants.join(", ")}</>}
                </div>
                <div className="tz-tel">
                  {l.tel_masque ? (
                    <>☎ <span className="tz-tel-num">{l.tel_masque}</span> <span className="tz-pill">n° vérifié · complet pour les abonnés</span></>
                  ) : (
                    <>☎ <span className="tz-pill soft">numéro en recherche — livré dès trouvé</span></>
                  )}
                </div>
              </div>
              <span className="tag">CHR</span>
            </div>
          ))}
          <div className="feed-foot">
            + {Math.max(reg.n30 - reg.leads.length, 0)} autres reprises dans votre région sur les 30 derniers jours
          </div>
        </div>
      </section>

      {/* La démo iPhone réutilisée */}
      <PhoneDemo />

      {/* Vos secteurs */}
      <section className="wrap tz-depts">
        <h2 className="disp">Là où ça se passe, chez vous</h2>
        <p className="center-sub">Reprises CHR des 90 derniers jours, département par département.</p>
        <div className="tz-dept-grid">
          {reg.depts.map((d) => (
            <div className="tz-dept" key={d.nom}>
              <div className="n">{d.n}</div>
              <div className="l">{d.nom}</div>
            </div>
          ))}
        </div>
        <p className="tz-team">
          Une équipe commerciale ? Chaque commercial peut recevoir <b>son</b> secteur, chaque matin.
          Parlez-nous-en, l&apos;offre multi-comptes existe.
        </p>
      </section>

      {/* L'offre */}
      <section className="pricing wrap tz-offer">
        <h2 className="disp">Ce que ça coûte. Ce que ça rapporte.</h2>
        <div className="tz-maths">
          <div className="tz-math">
            <div className="big">{perLeadRegional} €</div>
            <div>le prospect nominatif avec téléphone, en abonnement Régional
              ({reg.n30} reprises le mois dernier pour 299 €)</div>
          </div>
          <div className="tz-math">
            <div className="big">1 client</div>
            <div>signé grâce à une seule reprise rembourse environ deux ans d&apos;abonnement</div>
          </div>
        </div>
        <div className="tz-cta">
          <a className="btn" href="https://buy.stripe.com/14A5kD4AVe4Q7SZe1X8N201">
            Activer ma région · 299 €/mois
          </a>
          <a className="btn inv" href="https://buy.stripe.com/8x26oH2sN1i4gpv0b78N200">
            Mon département seul · 149 €/mois
          </a>
        </div>
        <p className="engage">Sans engagement · résiliable en un clic · premier digest dès demain 8h00</p>
      </section>

      <footer>
        <div className="wrap">
          <span>© 2026 LeBonProspect</span>
          <span>Données issues d&apos;actes officiels publiés (BODACC, licence ouverte Etalab)</span>
        </div>
      </footer>
    </main>
  );
}
