import Reveal from "./Reveal";
import { SiteNav, SiteFooter, Coche, Fleche } from "./SiteChrome";
import { fmt, formatDateFr } from "../lib/reprisesData";
import { TARIFS } from "../lib/tarifs";

/**
 * Corps commun des pages /reprises/... (SEO programmatique), dans la DA de la home (novembre 2026).
 * props : { verticaleKey, v (config verticale), region (string|null), stats, autres (liens vers pages sœurs) }
 * Public : jamais le nom du repreneur ni son numéro complet (libellé = enseigne ou activité, téléphone masqué).
 */
const FEAT = {
  departement: ["1 département au choix", "Email chaque matin avant 8h", "Nom, société et adresse du repreneur", "Numéro de l'établissement, quand il est vérifié"],
  region: ["Toutes les verticales de votre métier", "Export CSV pour votre CRM", "Support prioritaire"],
  national: ["Chaque commercial reçoit son secteur", "Export CSV & intégration CRM", "Interlocuteur dédié"],
};
const badgeCls = (b) => (b === "acquéreur établi" ? "h-badge neutre" : "h-badge");

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
    <div className="h-page">
      <Reveal />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ============ EN-TÊTE ============ */}
      <section className="h-hero h-dots rp2-hero">
        <SiteNav />
        <div className="h-wrap rp2-hero-in">
          <nav className="rp2-crumbs" aria-label="Fil d'Ariane">
            <a href="/">Accueil</a><span aria-hidden="true">/</span>
            <a href="/reprises">Reprises</a><span aria-hidden="true">/</span>
            {region ? <><a href={`/reprises/${v.slug}`}>{v.court}</a><span aria-hidden="true">/</span><b>{region}</b></> : <b>{v.court}</b>}
          </nav>
          <h1 className="h-h1 rp2-h1">{v.h1} <span className="soft">{zone}</span></h1>
          <p className="h-hero-sub">
            <strong>{fmt(stats.n365)}</strong> {v.nom} ont changé de propriétaire {zone} sur les 12 derniers mois, soit environ{" "}
            <strong>{fmt(stats.perMonth)} par mois</strong>. Chaque reprise est publiée au Journal officiel, et chaque repreneur
            équipe son établissement dans les 90 jours qui suivent.
          </p>
          <div className="h-ctas">
            <a href="/#zone" className="h-btn h-btn-lg">Recevoir les reprises de ma zone <Fleche /></a>
            <a href="#dernieres" className="h-btn-outline">Voir les dernières {stats.lastDate && <span className="h-date">{short(stats.lastDate)}</span>}</a>
          </div>
          <div className="h-chips">
            <div><b>{fmt(stats.n365)}</b><span>reprises {zone} sur 12 mois</span></div>
            <div><b>{fmt(stats.n30)}</b><span>sur les 30 derniers jours</span></div>
            <div><b>Avant 8h</b><span>le jour de la publication</span></div>
          </div>
          <p className="h-hero-note">Sans engagement · Données 100 % officielles · Aucun lead revendu</p>
        </div>
      </section>

      {/* ============ DERNIÈRES REPRISES ============ */}
      <section id="dernieres" className="h-sec h-white" data-reveal>
        <div className="h-wrap">
          <p className="h-eyebrow">En direct du Journal officiel</p>
          <h2 className="h-h2">Les dernières reprises {zone}</h2>
          <p className="h-lead">
            {stats.lastDate ? <>Dernière édition : {formatDateFr(stats.lastDate)}. </> : null}
            Chaque ligne renvoie à son annonce officielle. L&apos;identité du repreneur et son numéro complet sont réservés aux abonnés.
          </p>
          <div className="h-feed">
            <div className="h-feed-top">
              <span><span className="h-dot" aria-hidden="true" />Flux quotidien</span>
              <span className="h-mono">{v.court} · {zoneCourt}</span>
            </div>
            <ul className="rp2-feed">
              {stats.dernieres.map((it) => (
                <li key={it.id} className="rp2-row">
                  <div className="rp2-date h-mono">{short(it.date)}</div>
                  <div className="rp2-main">
                    <div className="rp2-t"><b>{it.libelle}</b>{it.badge && <span className={badgeCls(it.badge)}>{it.badge}</span>}</div>
                    <span className="rp2-m">{it.ville}{it.departement ? ` · ${it.departement}` : ""}</span>
                    <span className="rp2-lock">
                      Repreneur identifié · {it.telMasque ? <>téléphone {it.telMasque}</> : "numéro en recherche"}
                      {it.annonce && <> · <a href={it.annonce} target="_blank" rel="noopener noreferrer">annonce officielle</a></>}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="rp2-feed-foot">
              <span><strong>{fmt(Math.max(stats.n30 - stats.dernieres.length, 0))} autres reprises</strong> {zone} sur les 30 derniers jours</span>
              <a href="/#tarifs" className="h-btn">Débloquer le flux complet <Fleche /></a>
            </div>
          </div>
        </div>
      </section>

      {/* ============ DÉPARTEMENTS ============ */}
      {stats.depts.length > 0 && (
        <section className="h-sec" data-reveal>
          <div className="h-wrap">
            <p className="h-eyebrow">Là où ça se passe</p>
            <h2 className="h-h2 mb">Reprises de {v.nom} par département, sur 12 mois</h2>
            <div className="rp2-depts">
              {stats.depts.map((d) => (
                <div key={d.nom} className="rp2-dept"><b>{fmt(d.n)}</b><span>{d.nom}</span></div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ POUR QUI ============ */}
      <section className="h-sec h-dark h-dots" data-reveal>
        <div className="h-wrap">
          <p className="h-eyebrow soft">Pour qui</p>
          <h2 className="h-h2 w">Qui vend à un repreneur de {v.singulier} ?</h2>
          <p className="h-lead d">Dans les 90 jours qui suivent une reprise, le nouveau propriétaire remet tout à plat : {v.achats}.</p>
          <div className="h-grid3">
            <div className="h-card dark"><div className="h-why-n">01</div><h3>Son financement est réuni</h3><p>Pour racheter un fonds, il a réuni un financement : banque ou apport personnel. Ce n&apos;est pas un projet sur papier.</p></div>
            <div className="h-card dark"><div className="h-why-n">02</div><h3>Il achète maintenant, pas dans un an</h3><p>Les fournisseurs concernés : {v.fournisseurs}. Le premier qui appelle prend une longueur d&apos;avance.</p></div>
            <div className="h-card dark"><div className="h-why-n">03</div><h3>Vous l&apos;apprenez le jour même</h3><p>La cession est publiée au Journal officiel. Le jour de la publication, avant 8h, son nom, son adresse et, quand on l&apos;a vérifié, le numéro de l&apos;établissement sont dans votre boîte mail.</p></div>
          </div>
        </div>
      </section>

      {/* ============ TARIFS ============ */}
      <section id="tarifs" className="h-sec h-white" data-reveal>
        <div className="h-wrap">
          <p className="h-eyebrow">Tarifs</p>
          <h2 className="h-h2 mb">Recevoir les reprises de {v.nom} {zone}</h2>
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
              <div className="h-plan-s">{region ? `toute la région ${region}` : "tous les départements de votre région"}</div>
              <ul>{FEAT.region.map((t) => <li key={t}><Coche /><span>{t}</span></li>)}</ul>
              <a href={TARIFS.region.stripe} className="h-plan-btn fill">Prendre ma région</a>
            </div>
            <div className="h-plan">
              <div className="h-plan-t">{TARIFS.national.label}</div>
              <div className="h-plan-p devis"><b>Sur devis</b></div>
              <div className="h-plan-s">multi-régions, équipes commerciales</div>
              <ul>{FEAT.national.map((t) => <li key={t}><Coche c="#31777A" /><span>{t}</span></li>)}</ul>
              <a href={TARIFS.national.mailto} className="h-plan-btn">Parler à un humain</a>
            </div>
          </div>
          <div className="h-engage">Sans engagement, résiliable en 1 clic · engagement 6 mois : <strong>1 mois offert</strong> · engagement 12 mois : <strong>2 mois offerts</strong></div>
        </div>
      </section>

      {/* ============ PAGES SŒURS ============ */}
      {autres && autres.length > 0 && (
        <section className="h-sec" data-reveal>
          <div className="h-wrap">
            <h2 className="h-h2 mb">{region ? `Autres métiers ${zone}` : `${v.h1}, région par région`}</h2>
            <div className="rp2-links">
              {autres.map((a) => <a key={a.href} href={a.href}><span>{a.label}</span><span className="h-mono">{fmt(a.n)} / an</span></a>)}
            </div>
          </div>
        </section>
      )}

      <SiteFooter />
    </div>
  );
}
