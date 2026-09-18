import Header from "./Header";
import Reveal from "./Reveal";
import { fmt, formatDateFr, slugify, REGIONS, VERTICALES } from "../lib/reprisesData";

/**
 * Corps commun des pages /reprises/... (SEO programmatique).
 * props : { verticaleKey, v (config verticale), region (string|null), stats, autres (liens vers pages sœurs) }
 */
export default function ReprisesPage({ verticaleKey, v, region, stats, autres }) {
  const zone = region ? `en ${region}` : "en France";
  const zoneCourt = region || "France";
  const short = (d) => new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `${v.h1} ${zone}`,
    description: `${fmt(stats.n365)} cessions de fonds de commerce (${v.nom}) publiées au BODACC ${zone} sur les 12 derniers mois, avec identification du repreneur.`,
    creator: { "@type": "Organization", name: "LeBonProspect", url: "https://www.lebonprospect.fr" },
    license: "https://www.etalab.gouv.fr/licence-ouverte-open-licence",
    temporalCoverage: "P12M",
    spatialCoverage: zoneCourt,
  };

  return (
    <>
      <Reveal />
      <Header />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="hero wrap rp-hero">
        <div className="stamp"><span className="dot" />Données officielles BODACC · mises à jour chaque jour</div>
        <nav className="rp-crumbs" aria-label="Fil d'Ariane">
          <a href="/">Accueil</a><span>/</span>
          <a href="/reprises">Reprises</a><span>/</span>
          {region ? <><a href={`/reprises/${v.slug}`}>{v.court}</a><span>/</span><b>{region}</b></> : <b>{v.court}</b>}
        </nav>
        <h1>
          {v.h1} <span className="hl">{zone}</span>
        </h1>
        <p className="sub">
          <b>{fmt(stats.n365)}</b> {v.nom} ont changé de propriétaire {zone} sur les 12 derniers mois, soit environ{" "}
          <b>{fmt(stats.perMonth)} par mois</b>. Chaque reprise est publiée au Journal officiel. Chaque repreneur
          équipe son établissement dans les 90 jours qui suivent.
        </p>
        <div className="cta-row">
          <a className="btn" href="/#tarifs">Recevoir les reprises de ma zone</a>
          <a className="btn inv" href="#dernieres">Voir les dernières</a>
        </div>
        <div className="small-note">Sans engagement · Données 100 % officielles · Aucun lead revendu</div>
      </section>

      <section className="proof-band" data-reveal>
        <div className="wrap proof">
          <div><div className="n">{fmt(stats.n365)}</div><div className="l">reprises {zone} sur 12 mois</div></div>
          <div><div className="n">{fmt(stats.n30)}</div><div className="l">sur les 30 derniers jours</div></div>
          <div><div className="n">{stats.pctTel} %</div><div className="l">livrées avec le téléphone de l&apos;établissement</div></div>
          <div><div className="n">24 h</div><div className="l">entre la publication et votre email</div></div>
        </div>
      </section>

      <section className="feed-sec wrap" id="dernieres" data-reveal>
        <div className="sec-head">
          <span className="eyebrow">En direct du Journal officiel</span>
          <h2 className="disp">Les dernières reprises {zone}</h2>
          <p className="center-sub">
            {stats.lastDate ? <>Dernière édition : {formatDateFr(stats.lastDate)}. </> : null}
            Chaque ligne est vérifiable publiquement au BODACC. Le numéro complet et l&apos;identité du repreneur sont réservés aux abonnés.
          </p>
        </div>
        <div className="feed">
          <div className="feed-head">
            <span className="live"><span className="dot" />Flux quotidien</span>
            <span className="mono" style={{ fontSize: 12 }}>{v.court} · {zoneCourt}</span>
          </div>
          {stats.dernieres.map((it) => (
            <div className="row" key={it.id}>
              <div className="date">{short(it.date)}<br />{it.ville}</div>
              <div className="what">
                <b>{it.acheteur}</b> reprend {it.etablissement ? <>« {it.etablissement} »</> : "un fonds de commerce"}{" "}
                {it.badge && <span className={`badge-fresh${it.badge === "en expansion" ? " exp" : ""}`}>{it.badge}</span>}
                <br />
                <span className="meta">
                  {it.telMasque ? <>Repreneur identifié · ☎ {it.telMasque}</> : <>Repreneur identifié · numéro en recherche</>} · {it.departement}
                </span>
              </div>
            </div>
          ))}
          <div className="feed-foot">
            {fmt(Math.max(stats.n30 - stats.dernieres.length, 0))} autres reprises {zone} sur les 30 derniers jours.{" "}
            <a href="/#tarifs">débloquer le flux complet →</a>
          </div>
        </div>
      </section>

      {stats.depts.length > 0 && (
        <section className="cibles-sec" data-reveal>
          <div className="wrap">
            <div className="sec-head">
              <span className="eyebrow">Là où ça se passe</span>
              <h2 className="disp">Reprises de {v.nom} par département, sur 12 mois</h2>
            </div>
            <div className="rp-dept-grid">
              {stats.depts.map((d) => (
                <div className="rp-dept" key={d.nom}>
                  <div className="n">{fmt(d.n)}</div>
                  <div className="l">{d.nom}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="why-sec wrap" data-reveal>
        <div className="sec-head">
          <span className="eyebrow">Pour qui</span>
          <h2 className="disp">Qui vend à un repreneur de {v.singulier} ?</h2>
          <p className="center-sub">Dans les 90 jours qui suivent une reprise, le nouveau propriétaire remet tout à plat : {v.achats}.</p>
        </div>
        <div className="why-grid">
          <div className="why"><div className="why-n">01</div><h3>Son financement est validé</h3><p>Pour racheter un fonds, il a convaincu une banque. Ce n&apos;est pas un projet sur papier, c&apos;est un budget disponible.</p></div>
          <div className="why"><div className="why-n">02</div><h3>Il achète maintenant, pas dans un an</h3><p>Les fournisseurs concernés : {v.fournisseurs}. Le premier qui appelle prend une longueur d&apos;avance.</p></div>
          <div className="why"><div className="why-n">03</div><h3>Vous l&apos;apprenez à J+1</h3><p>La cession est publiée au Journal officiel. Le lendemain à 8h, son nom, son adresse et le numéro de l&apos;établissement sont dans votre boîte mail.</p></div>
        </div>
      </section>

      <section className="pricing wrap" id="tarifs" data-reveal>
        <div className="sec-head">
          <span className="eyebrow">Tarifs</span>
          <h2 className="disp">Recevoir les reprises de {v.nom} {zone}</h2>
        </div>
        <div className="plans">
          <div className="plan">
            <h3>Mon département</h3>
            <div className="price">149 € <small>/mois</small></div>
            <div className="vol">1 département au choix</div>
            <ul><li>Email chaque matin à 8h</li><li>Nom, société et adresse du repreneur</li><li>Numéro de téléphone de l&apos;établissement</li></ul>
            <a className="btn inv" href="https://buy.stripe.com/8x26oH2sN1i4gpv0b78N200">Surveiller mon département</a>
          </div>
          <div className="plan mid">
            <span className="tag2">Le plus choisi</span>
            <h3>Ma région</h3>
            <div className="price">299 € <small>/mois</small></div>
            <div className="vol">{region ? `toute la région ${region}` : "1 région complète"}</div>
            <ul><li>Toutes les verticales de votre métier</li><li>Export CSV pour votre CRM</li><li>Support prioritaire</li></ul>
            <a className="btn" href="https://buy.stripe.com/14A5kD4AVe4Q7SZe1X8N201">Prendre ma région</a>
          </div>
          <div className="plan">
            <h3>Toute la France</h3>
            <div className="price price-devis">Sur devis</div>
            <div className="vol">multi-régions, équipes commerciales</div>
            <ul><li>Chaque commercial reçoit son secteur</li><li>Export CSV &amp; intégration CRM</li><li>Interlocuteur dédié</li></ul>
            <a className="btn inv" href="mailto:contact@lebonprospect.fr?subject=Offre%20nationale%20LeBonProspect">Parler à un humain</a>
          </div>
        </div>
        <p className="engage">Sans engagement, résiliable en 1 clic · engagement 6 mois : <b>1 mois offert</b> · engagement 12 mois : <b>2 mois offerts</b></p>
      </section>

      {autres && autres.length > 0 && (
        <section className="rp-links wrap" data-reveal>
          <h2 className="disp" style={{ fontSize: 26 }}>{region ? `Autres métiers ${zone}` : `${v.h1}, région par région`}</h2>
          <div className="rp-links-grid">
            {autres.map((a) => <a key={a.href} href={a.href}>{a.label}<span>{fmt(a.n)} / an</span></a>)}
          </div>
        </section>
      )}

      <footer>
        <div className="wrap">
          <span>© 2026 LeBonProspect · données publiques BODACC (licence ouverte)</span>
          <span><a href="/mentions-legales" style={{ color: "inherit" }}>Mentions légales</a> · <a href="/cgv" style={{ color: "inherit" }}>CGV</a> · <a href="mailto:contact@lebonprospect.fr" style={{ color: "inherit" }}>Contact</a></span>
        </div>
      </footer>
    </>
  );
}
