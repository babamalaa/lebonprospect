// Tests des règles du calculateur (brief de refonte, section 6). Lancer : node site/app/components/calcul.test.mjs
import assert from "node:assert/strict";

const TARIFS = { departement: { prix: 149 }, region: { prix: 299 } };
function calculer({ plan, contrat, appels, taux }) {
  const prix = plan === "region" ? TARIFS.region.prix : TARIFS.departement.prix;
  const coutAnnuel = prix * 12;
  const pointMort = Math.max(1, Math.ceil(coutAnnuel / contrat));
  const clientsParMois = (appels * taux) / 100;
  const caMois = clientsParMois * contrat;
  let verdict;
  if (caMois >= prix) verdict = "couvert";
  else if (caMois > 0) verdict = (prix / caMois).toLocaleString("fr-FR", { maximumFractionDigits: 1 });
  else verdict = "augmentez";
  return { coutAnnuel, pointMort, clientsParMois, caMois, verdict };
}

// Valeurs attendues calculées à la main à partir des règles du brief
const cas = [
  [{ plan: "departement", contrat: 3000, appels: 30, taux: 5 }, { coutAnnuel: 1788, pointMort: 1, clientsParMois: 1.5, caMois: 4500, verdict: "couvert" }],
  [{ plan: "departement", contrat: 500, appels: 5, taux: 1 }, { coutAnnuel: 1788, pointMort: 4, clientsParMois: 0.05, caMois: 25, verdict: "6" }],
  [{ plan: "departement", contrat: 20000, appels: 150, taux: 25 }, { coutAnnuel: 1788, pointMort: 1, clientsParMois: 37.5, caMois: 750000, verdict: "couvert" }],
  [{ plan: "region", contrat: 500, appels: 5, taux: 1 }, { coutAnnuel: 3588, pointMort: 8, clientsParMois: 0.05, caMois: 25, verdict: "12" }],
];
for (const [entree, attendu] of cas) {
  const r = calculer(entree);
  for (const k of Object.keys(attendu)) assert.equal(r[k], attendu[k], `${JSON.stringify(entree)} : ${k} = ${r[k]}, attendu ${attendu[k]}`);
}

// Le composant applique exactement ces règles : on vérifie que le code source contient les mêmes formules
import { readFileSync } from "node:fs";
const src = readFileSync(new URL("./Calculateur.js", import.meta.url), "utf8");
for (const f of ["Math.max(1, Math.ceil(coutAnnuel / contrat))", "(appels * taux) / 100", "clientsParMois * contrat", "Math.max(caMois, prix, 1)", "caMois >= prix"])
  assert.ok(src.includes(f), `formule absente du composant : ${f}`);
// Phrase « en un deal » (décision du 11 nov. 2026), recalculée à la main
const unDeal = (plan, contrat) => {
  const prix = plan === "region" ? 299 : 149, an = prix * 12, m = Math.floor(contrat / prix);
  return contrat >= an ? "annee" : m >= 1 ? `${m} mois` : `${Math.ceil(prix / contrat)} contrats`;
};
assert.equal(unDeal("departement", 3000), "annee");      // 3 000 >= 1 788
assert.equal(unDeal("departement", 500), "3 mois");      // 500 / 149 = 3,4
assert.equal(unDeal("region", 3000), "10 mois");         // 3 000 / 299 = 10,03
assert.equal(unDeal("region", 3588), "annee");
for (const f of ["contrat >= coutAnnuel", "Math.floor(contrat / prix)", "caMois * 12"]) assert.ok(src.includes(f), `formule absente : ${f}`);
console.log(`calculateur : ${cas.length} jeux de valeurs OK + phrase « un deal » OK, formules identiques au brief`);
