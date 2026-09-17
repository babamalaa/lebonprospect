"use client";

import { useState } from "react";

export default function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header>
      <div className="wrap nav">
        <a className="logo" href="/">
          <span className="mark">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 13 L7 5 L11 10 L16 3" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="16" cy="3" r="2.2" fill="#d64a2e" />
            </svg>
          </span>
          LeBonProspect
        </a>
        <button
          className={`burger${open ? " open" : ""}`}
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <span /><span /><span />
        </button>
        <nav className={`links${open ? " open" : ""}`} onClick={() => setOpen(false)}>
          <a href="/#comment">Comment ça marche</a>
          <a href="/#exemple">Exemple d&apos;email</a>
          <a href="/#pour-qui">Pour qui</a>
          <a href="/#tarifs">Tarifs</a>
          <a href="/#faq">FAQ</a>
          <a className="btn nav-cta" href="/#tarifs">Voir ma zone</a>
        </nav>
      </div>
    </header>
  );
}
