"use client";

import { useEffect, useRef, useState } from "react";

/* Séquence animée : ce que reçoit un abonné chaque matin.
   Phase 0: écran verrouillé, 8h00, la notification tombe
   Phase 1: l'email s'ouvre, header du digest
   Phase 2+: les leads apparaissent un à un
   Phase finale: pause, puis boucle. */

const LEADS = [
  { nom: "Les Glougloutons", ville: "Lyon · Rhône", rep: "Shelly Bernicot", tel: "04 72 13 96 26", badge: "budgets ouverts" },
  { nom: "MexiKebab", ville: "Ambérieu-en-Bugey · Ain", rep: "Serkan & Yasin Tuna", tel: "04 74 61 49 70", badge: "en expansion" },
  { nom: "Bee's Café", ville: "Mirabel-et-Blacons · Drôme", rep: "Didier & Nolan Millier", tel: "04 75 40 05 99", badge: "budgets ouverts" },
];

const PHASES = LEADS.length + 3; // lock → open → leads... → hold

export default function PhoneDemo() {
  const [phase, setPhase] = useState(0);
  const [running, setRunning] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => setRunning(e.isIntersecting),
      { threshold: 0.35 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!running) return;
    const durations = [1900, 1400, 950, 950, 950, 3800];
    const t = setTimeout(() => setPhase((p) => (p + 1) % PHASES), durations[Math.min(phase, durations.length - 1)]);
    return () => clearTimeout(t);
  }, [phase, running]);

  const locked = phase === 0;
  const visibleLeads = Math.max(0, phase - 1);

  return (
    <section className="demo-sec" ref={ref}>
      <div className="wrap">
        <h2 className="disp">Voici votre 8h00, chaque matin</h2>
        <p className="center-sub">
          Pas de dashboard à ouvrir, pas de logiciel à apprendre. Un email, des reprises, des numéros. Vous lisez,
          vous appelez.
        </p>

        <div className="demo-stage">
          <div className="phone">
            <div className="phone-notch" />
            <div className="phone-screen">
              {/* ÉCRAN VERROUILLÉ */}
              <div className={`lockscreen${locked ? " on" : ""}`}>
                <div className="lock-time">8:00</div>
                <div className="lock-date">mardi 8 septembre</div>
                <div className={`notif${locked ? " drop" : ""}`}>
                  <div className="notif-head">
                    <span className="notif-app">
                      <svg width="12" height="12" viewBox="0 0 18 18" fill="none">
                        <path d="M2 13 L7 5 L11 10 L16 3" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    LEBONPROSPECT · maintenant
                  </div>
                  <div className="notif-title">7 reprises de commerces · votre zone</div>
                  <div className="notif-body">Les Glougloutons (Lyon 3e), MexiKebab (Ambérieu)…</div>
                </div>
              </div>

              {/* EMAIL OUVERT */}
              <div className={`mail${locked ? "" : " on"}`}>
                <div className="mail-top">
                  <span className="mail-badge">LBP</span>
                  <div>
                    <div className="mail-from">LeBonProspect</div>
                    <div className="mail-sub">7 reprises · Auvergne-Rhône-Alpes</div>
                  </div>
                </div>
                <div className="mail-h1">7 commerces viennent de changer de mains</div>
                <div className="mail-meta">Restaurants, bars &amp; hôtels · publiés hier au Journal officiel</div>

                {LEADS.map((l, i) => (
                  <div key={l.nom} className={`mlead${i < visibleLeads ? " show" : ""}`}>
                    <div className="mlead-top">
                      <span className="mlead-nom">{l.nom}</span>
                      <span className={`mlead-badge${l.badge === "en expansion" ? " exp" : ""}`}>{l.badge}</span>
                    </div>
                    <div className="mlead-ville">{l.ville}</div>
                    <div className="mlead-row">Repreneur : <b>{l.rep}</b></div>
                    <div className="mlead-tel">
                      <span className="tel-ico">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                          <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3A19.5 19.5 0 0 1 5.2 13 19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z" fill="#fff"/>
                        </svg>
                      </span>
                      {l.tel}
                    </div>
                  </div>
                ))}

                <div className={`mail-more${visibleLeads >= LEADS.length ? " show" : ""}`}>
                  + 4 autres reprises dans votre édition du jour
                </div>
              </div>
            </div>
          </div>

          {/* Légendes latérales */}
          <div className="demo-points">
            <div className={`dpoint${phase >= 1 ? " lit" : ""}`}>
              <span className="dpoint-n">1</span>
              <div><b>Détecté cette nuit</b><br />au Journal officiel, trié pour votre métier et votre zone</div>
            </div>
            <div className={`dpoint${phase >= 2 ? " lit" : ""}`}>
              <span className="dpoint-n">2</span>
              <div><b>Repreneur identifié</b><br />nom, société, adresse de l&apos;établissement repris</div>
            </div>
            <div className={`dpoint${phase >= 3 ? " lit" : ""}`}>
              <span className="dpoint-n">3</span>
              <div><b>Numéro prêt à appeler</b><br />un tap et vous êtes le premier fournisseur en ligne</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
