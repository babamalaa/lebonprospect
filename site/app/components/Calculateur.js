"use client";

import { useState } from "react";
import { TARIFS } from "../lib/tarifs";

// Calculateur (#calculateur). Règles du brief de refonte, reproduites à l'identique (testées dans calcul.test.mjs).
export function calculer({ plan, contrat, appels, taux }) {
  const prix = plan === "region" ? TARIFS.region.prix : TARIFS.departement.prix;
  const coutAnnuel = prix * 12;
  const pointMort = Math.max(1, Math.ceil(coutAnnuel / contrat));
  const clientsParMois = (appels * taux) / 100;
  const caMois = clientsParMois * contrat;
  const max = Math.max(caMois, prix, 1);
  let verdict;
  if (caMois >= prix) verdict = "Avec ces chiffres, l'abonnement est couvert dès le premier mois.";
  else if (caMois > 0) verdict = `Avec ces chiffres, point mort en environ ${(prix / caMois).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} mois.`;
  else verdict = "Augmentez le nombre d'appels ou le taux de signature pour voir le point mort.";
  return { prix, coutAnnuel, pointMort, clientsParMois, caMois, barreCout: (prix / max) * 100, barreCa: (caMois / max) * 100, verdict };
}

const eur = (n) => `${Math.round(n).toLocaleString("fr-FR")} €`;
const un = (n) => n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

export default function Calculateur() {
  const [plan, setPlan] = useState("departement");
  const [contrat, setContrat] = useState(3000);
  const [appels, setAppels] = useState(30);
  const [taux, setTaux] = useState(5);
  const r = calculer({ plan, contrat, appels, taux });

  const sliders = [
    { id: "sl-contrat", label: "Valeur moyenne d'un contrat signé", min: 500, max: 20000, step: 250, value: contrat, set: setContrat, display: eur(contrat), help: "Le montant que vous facturez à un nouveau client." },
    { id: "sl-appels", label: "Repreneurs appelés par mois", min: 5, max: 150, step: 5, value: appels, set: setAppels, display: String(appels), help: "Le nombre d'appels que vous êtes prêt à passer." },
    { id: "sl-taux", label: "Taux de signature", min: 1, max: 25, step: 1, value: taux, set: setTaux, display: `${taux} %`, help: "Sur 100 repreneurs appelés, combien signent chez vous ? À ajuster à votre réalité." },
  ];

  return (
    <section id="calculateur" className="h-sec h-calc">
      <div className="h-wrap">
        <p className="h-eyebrow">Calculateur</p>
        <h2 className="h-h2">Combien de clients pour rentabiliser l&apos;abonnement ?</h2>
        <p className="h-lead">Réglez avec vos propres chiffres. Les valeurs de départ ne sont que des exemples : ajustez-les à votre réalité.</p>

        <div className="calc">
          <div className="calc-set">
            <div>
              <div className="calc-l" id="calc-formule">Votre formule</div>
              <div className="calc-toggle" role="group" aria-labelledby="calc-formule">
                <button type="button" aria-pressed={plan === "departement"} className={plan === "departement" ? "on" : ""} onClick={() => setPlan("departement")}>
                  {TARIFS.departement.label} · {TARIFS.departement.prix} €
                </button>
                <button type="button" aria-pressed={plan === "region"} className={plan === "region" ? "on" : ""} onClick={() => setPlan("region")}>
                  {TARIFS.region.label} · {TARIFS.region.prix} €
                </button>
              </div>
            </div>
            {sliders.map((s) => (
              <div key={s.id}>
                <div className="calc-sl-head">
                  <label htmlFor={s.id}>{s.label}</label>
                  <span>{s.display}</span>
                </div>
                <input id={s.id} type="range" min={s.min} max={s.max} step={s.step} value={s.value}
                  onChange={(e) => s.set(Number(e.target.value))} aria-valuetext={s.display} />
                <div className="calc-help">{s.help}</div>
              </div>
            ))}
          </div>

          <div className="calc-res" aria-live="polite">
            <div>
              <div className="calc-res-l">Point mort annuel</div>
              <div className="calc-big">
                <span className="n">{r.pointMort}</span>
                <span className="t">{r.pointMort === 1 ? "client signé" : "clients signés"} par an pour couvrir l&apos;abonnement</span>
              </div>
              <div className="calc-sub">Coût sur 12 mois : <strong>{eur(r.coutAnnuel)}</strong>, soit un contrat moyen de {eur(contrat)}.</div>
            </div>
            <div className="calc-tiles">
              <div><b>{un(r.clientsParMois)}</b><span>clients signés par mois, d&apos;après vos réglages</span></div>
              <div><b>{eur(r.caMois)}</b><span>de chiffre d&apos;affaires estimé par mois</span></div>
            </div>
            <div className="calc-bars">
              <div>
                <div className="calc-bar-h"><span>Abonnement mensuel</span><span className="m">{eur(r.prix)}</span></div>
                <div className="calc-bar"><i style={{ width: `${r.barreCout.toFixed(1)}%`, background: "#0B1020" }} /></div>
              </div>
              <div>
                <div className="calc-bar-h"><span>Chiffre d&apos;affaires estimé</span><span className="m">{eur(r.caMois)}</span></div>
                <div className="calc-bar"><i style={{ width: `${r.barreCa.toFixed(1)}%`, background: "#31777A" }} /></div>
              </div>
            </div>
            <div className="calc-verdict">{r.verdict}</div>
            <div className="calc-note">Calcul sur le chiffre d&apos;affaires, pas sur la marge. Aucun taux de conversion n&apos;est supposé à votre place.</div>
            <a href="#zone" className="calc-cta">Voir les reprises de ma zone
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18"><path d="M3 9h11M10 4.5L14.5 9 10 13.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
