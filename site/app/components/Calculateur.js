"use client";

import { useState } from "react";
import { TARIFS } from "../lib/tarifs";
import { fr, nombre } from "../lib/typo";
import Icon from "./Icon";

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

const eur = (n) => `${nombre(Math.round(n))}\u00a0€`;
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
    { id: "sl-taux", label: "Taux de signature", min: 1, max: 25, step: 1, value: taux, set: setTaux, display: `${taux}\u00a0%`, help: "Sur 100 repreneurs appelés, combien signent chez vous ? À ajuster à votre réalité." },
  ];

  return (
    <section id="calculateur" className="hp-sec hp-sec-t0">
      <div className="hp-wrap">
        <div className="hp-head">
          <p className="hp-eyebrow">Calculateur</p>
          <h2 className="hp-h2">{fr("Combien de clients pour rentabiliser l'abonnement ?")}</h2>
          <p className="hp-lead">{fr("Réglez avec vos propres chiffres. Les valeurs de départ ne sont que des exemples : ajustez-les à votre réalité.")}</p>
        </div>

        <div className="hp-calc">
          <div className="hp-calc-set">
            <div>
              <p className="hp-calc-l" id="calc-formule">Votre formule</p>
              <div className="hp-seg" role="group" aria-labelledby="calc-formule">
                <button type="button" aria-pressed={plan === "departement"} onClick={() => setPlan("departement")}>
                  Mon département · {TARIFS.departement.prix}{"\u00a0"}€
                </button>
                <button type="button" aria-pressed={plan === "region"} onClick={() => setPlan("region")}>
                  Ma région · {TARIFS.region.prix}{"\u00a0"}€
                </button>
              </div>
            </div>
            {sliders.map((s) => (
              <div key={s.id} className="hp-sl">
                <div className="hp-sl-head">
                  <label htmlFor={s.id}>{fr(s.label)}</label>
                  <span>{s.display}</span>
                </div>
                <input id={s.id} type="range" min={s.min} max={s.max} step={s.step} value={s.value}
                  style={{ "--p": `${(((s.value - s.min) / (s.max - s.min)) * 100).toFixed(1)}%` }}
                  onChange={(e) => s.set(Number(e.target.value))} aria-valuetext={s.display} />
                <p className="hp-sl-help">{fr(s.help)}</p>
              </div>
            ))}
          </div>

          <div className="hp-calc-res" aria-live="polite">
            <div>
              <p className="hp-calc-res-l">Point mort annuel</p>
              <div className="hp-calc-big">
                <span className="n">{r.pointMort}</span>
                <span className="t">{r.pointMort === 1 ? "client signé" : "clients signés"} par an pour couvrir l{"\u2019"}abonnement</span>
              </div>
              <p className="hp-calc-sub">Coût sur 12 mois{"\u00a0"}: {eur(r.coutAnnuel)}, soit un contrat moyen de {eur(contrat)}.</p>
            </div>
            <div className="hp-calc-figs">
              <div><b>{un(r.clientsParMois)}</b><span>{fr("clients signés par mois, d'après vos réglages")}</span></div>
              <div><b>{eur(r.caMois)}</b><span>{fr("de chiffre d'affaires estimé par mois")}</span></div>
            </div>
            <div className="hp-calc-bars">
              <div>
                <div className="hp-calc-bar-h"><span>Abonnement mensuel</span><span>{eur(r.prix)}</span></div>
                <div className="hp-calc-bar"><i style={{ width: `${r.barreCout.toFixed(1)}%`, background: "#556079" }} /></div>
              </div>
              <div>
                <div className="hp-calc-bar-h"><span>{fr("Chiffre d'affaires estimé")}</span><span>{eur(r.caMois)}</span></div>
                <div className="hp-calc-bar"><i style={{ width: `${r.barreCa.toFixed(1)}%`, background: "#7CC3C6" }} /></div>
              </div>
            </div>
            <p className="hp-calc-verdict"><Icon name="check" />{fr(r.verdict)}</p>
            <p className="hp-calc-note">{fr("Calcul sur le chiffre d'affaires, pas sur la marge. Aucun taux de conversion n'est supposé à votre place.")}</p>
            <a href="#zone" className="hp-btn hp-btn-block">Voir les reprises de ma zone <Icon name="arrow-right" size={18} /></a>
          </div>
        </div>
      </div>
    </section>
  );
}
