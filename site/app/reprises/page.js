import Reveal from "../components/Reveal";
import { SiteNav, SiteFooter, Fleche } from "../components/SiteChrome";
import { VERTICALES, slugify, getIndexableCombos, fmt } from "../lib/reprisesData";

export const revalidate = 86400;

export const metadata = {
  title: "Reprises de commerces en France, par métier et par région",
  description: "Toutes les cessions de fonds de commerce publiées au BODACC, triées par métier (restaurants, boulangeries, salons, garages, pharmacies) et par région. Chiffres réels, mis à jour chaque jour.",
  alternates: { canonical: "https://www.lebonprospect.fr/reprises" },
};

export default async function ReprisesIndex() {
  const combos = await getIndexableCombos();
  const byV = {};
  combos.forEach((c) => { (byV[c.verticale] = byV[c.verticale] || []).push(c); });
  const totalByV = Object.fromEntries(Object.entries(byV).map(([k, arr]) => [k, arr.reduce((s, c) => s + c.n, 0)]));

  return (
    <div className="h-page">
      <Reveal />
      <section className="h-hero h-dots rp2-hero">
        <SiteNav />
        <div className="h-wrap rp2-hero-in">
          <nav className="rp2-crumbs" aria-label="Fil d'Ariane"><a href="/">Accueil</a><span aria-hidden="true">/</span><b>Reprises</b></nav>
          <h1 className="h-h1 rp2-h1">Qui vient de racheter <span className="soft">un commerce près de chez vous ?</span></h1>
          <p className="h-hero-sub">Chaque cession de fonds de commerce est publiée au Journal officiel. Nous les trions par métier et par région, et nous identifions le repreneur. <strong>Choisissez votre métier.</strong></p>
          <div className="rp2-jump" aria-label="Aller à un métier">
            {Object.entries(VERTICALES).filter(([key]) => byV[key]?.length).map(([key, v]) => (
              <a key={key} href={`#${v.slug}`} className="zm-chip">{v.court}</a>
            ))}
          </div>
        </div>
      </section>

      <section className="h-sec" data-reveal>
        <div className="h-wrap rp2-index">
          {Object.entries(VERTICALES).map(([key, v]) => (
            <div className="rp2-block" key={key} id={v.slug}>
              <div className="rp2-block-head">
                <h2><a href={`/reprises/${v.slug}`}>{v.h1}</a></h2>
                <span className="h-badge">{fmt(totalByV[key] || 0)} reprises / an</span>
              </div>
              <div className="rp2-links">
                {(byV[key] || []).map((c) => (
                  <a key={c.region} href={`/reprises/${v.slug}/${slugify(c.region)}`}><span>{c.region}</span><span className="h-mono">{fmt(c.n)} / an</span></a>
                ))}
              </div>
              <a href={`/reprises/${v.slug}`} className="rp2-more">Toute la France <Fleche /></a>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
