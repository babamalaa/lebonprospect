// Source unique des tarifs publics : home (hero, carte, calculateur, tarifs), et tout ce qui affiche un prix.
// Changer un prix ici le change partout. Les liens Stripe ne doivent jamais être modifiés sans décision explicite.
export const TARIFS = {
  departement: { prix: 149, label: "Mon département", stripe: "https://buy.stripe.com/8x26oH2sN1i4gpv0b78N200" },
  region: { prix: 299, label: "Ma région", stripe: "https://buy.stripe.com/14A5kD4AVe4Q7SZe1X8N201" },
  national: { label: "Toute la France", mailto: "mailto:contact@lebonprospect.fr?subject=Offre%20nationale%20LeBonProspect" },
};

// Lien Stripe du département, avec la zone choisie sur la carte transmise à Stripe (client_reference_id).
// Le webhook la lit pour pré-remplir la zone de l'abonné. Format : dep-69
export function stripeDepartement(code) {
  if (!code) return TARIFS.departement.stripe;
  return `${TARIFS.departement.stripe}?client_reference_id=dep-${encodeURIComponent(code)}`;
}
