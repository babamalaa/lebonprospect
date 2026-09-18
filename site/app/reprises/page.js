import Header from "../components/Header";
import Reveal from "../components/Reveal";
import { VERTICALES, REGIONS, slugify, getIndexableCombos, fmt } from "../lib/reprisesData";

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
    <>
      <Reveal />
      <Header />
      <section className="hero wrap rp-hero">
        <div className="stamp"><span className="dot" />Données officielles BODACC · mises à jour chaque jour</div>
        <h1>Qui vient de racheter <span className="hl">un commerce près de chez vous ?</span></h1>
        <p className="sub">Chaque cession de fonds de commerce est publiée au Journal officiel. Nous les trions par métier et par région, et nous identifions le repreneur. Choisissez votre métier.</p>
      </section>
      <section className="wrap rp-index" data-reveal>
        {Object.entries(VERTICALES).map(([key, v]) => (
          <div className="rp-index-block" key={key}>
            <div className="rp-index-head">
              <h2><a href={`/reprises/${v.slug}`}>{v.h1}</a></h2>
              <span className="mono">{fmt(totalByV[key] || 0)} reprises / an</span>
            </div>
            <div className="rp-links-grid">
              {(byV[key] || []).map((c) => (
                <a key={c.region} href={`/reprises/${v.slug}/${slugify(c.region)}`}>{c.region}<span>{fmt(c.n)} / an</span></a>
              ))}
            </div>
          </div>
        ))}
      </section>
      <footer>
        <div className="wrap">
          <span>© 2026 LeBonProspect · données publiques BODACC (licence ouverte)</span>
          <span><a href="/mentions-legales" style={{ color: "inherit" }}>Mentions légales</a> · <a href="/cgv" style={{ color: "inherit" }}>CGV</a></span>
        </div>
      </footer>
    </>
  );
}
