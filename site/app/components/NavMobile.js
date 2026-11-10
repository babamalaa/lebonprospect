"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";

// Menu mobile de la home : bouton « menu » (zone 44 x 44) qui ouvre une feuille plein écran avec les 6 liens.
const LIENS = [
  ["#comment", "Comment ça marche"], ["#exemple", "Exemple d’email"], ["#pour-qui", "Pour qui"],
  ["/reprises", "Reprises par région"], ["#tarifs", "Tarifs"], ["#faq", "FAQ"],
];

export default function NavMobile() {
  const [ouvert, setOuvert] = useState(false);
  useEffect(() => {
    document.documentElement.style.overflow = ouvert ? "hidden" : "";
    const esc = (e) => e.key === "Escape" && setOuvert(false);
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("keydown", esc); document.documentElement.style.overflow = ""; };
  }, [ouvert]);
  return (
    <>
      <button type="button" className="hp-menu-btn" aria-label="Ouvrir le menu" aria-expanded={ouvert} aria-controls="hp-sheet" onClick={() => setOuvert(true)}>
        <Icon name="menu" size={20} />
      </button>
      {ouvert && (
        <div id="hp-sheet" className="hp-sheet" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="hp-menu-btn hp-sheet-x" aria-label="Fermer le menu" onClick={() => setOuvert(false)}>
            <Icon name="x" size={20} />
          </button>
          <nav aria-label="Navigation mobile">
            {LIENS.map(([h, l]) => <a key={h} href={h} onClick={() => setOuvert(false)}>{l}</a>)}
          </nav>
        </div>
      )}
    </>
  );
}
