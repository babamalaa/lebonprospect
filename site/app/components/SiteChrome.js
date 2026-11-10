// Habillage commun (nouvelle DA de la home) pour les pages hors home : barre de navigation sombre, logo, pied de page.
// Mêmes classes que la home (home.css, préfixe .h-) : aucune nouvelle feuille de style.
export const Logo = ({ size = 28 }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 28 28"><rect width="28" height="28" rx="8" fill="#31777A" /><path d="M8 14.5l4 4 8-9" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
export const Fleche = () => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18"><path d="M3 9h11M10 4.5L14.5 9 10 13.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
export const Coche = ({ c = "#7CC3C6" }) => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" className="h-ico"><path d="M4 9.5l3.2 3.2L14 5.8" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export function SiteNav() {
  return (
    <div className="h-wrap h-nav">
      <a href="/" className="h-logo"><Logo />LeBonProspect</a>
      <nav className="h-nav-links" aria-label="Navigation principale">
        <a href="/#comment">Comment ça marche</a>
        <a href="/#exemple">Exemple d&apos;email</a>
        <a href="/#pour-qui">Pour qui</a>
        <a href="/reprises" aria-current="page">Reprises par région</a>
        <a href="/#tarifs">Tarifs</a>
        <a href="/#faq">FAQ</a>
      </nav>
      <a href="/#zone" className="h-nav-cta">Voir ma zone</a>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="h-foot h-dots">
      <div className="h-wrap">
        <div className="h-foot-top">
          <div className="h-foot-brand">
            <a href="/" className="h-logo"><Logo />LeBonProspect</a>
            <p>Les reprises de commerces publiées au BODACC, avec le nom du repreneur, l&apos;adresse et le téléphone quand il est vérifié, dans votre boîte mail avant 8h.</p>
            <a href="/#zone" className="h-btn">Voir les reprises de ma zone <Fleche /></a>
          </div>
          <div className="h-foot-cols">
            <div><div className="h-mono-l">Produit</div><a href="/#comment">Comment ça marche</a><a href="/#zone">Choisir ma zone</a><a href="/#calculateur">Calculateur</a><a href="/#exemple">Exemple d&apos;email</a><a href="/#tarifs">Tarifs</a></div>
            <div><div className="h-mono-l">Ressources</div><a href="/reprises">Reprises par région</a><a href="/#pour-qui">Pour qui</a><a href="/#faq">FAQ</a><a href="mailto:contact@lebonprospect.fr">Contact</a></div>
            <div><div className="h-mono-l">Légal</div><a href="/mentions-legales">Mentions légales</a><a href="/cgv">CGV</a><a href="/confidentialite">Confidentialité</a></div>
          </div>
        </div>
        <div className="h-foot-bot">
          <span>© 2026 LeBonProspect. Tous droits réservés.</span>
          <span>Données publiques BODACC, réutilisées sous licence ouverte.</span>
        </div>
      </div>
    </footer>
  );
}
