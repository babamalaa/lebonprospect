// Libellé public d'une reprise (home, carte, flux). Règle : jamais le nom d'une personne.
// Pour un entrepreneur individuel, la raison sociale EST le nom du repreneur, et la base ne permet pas
// de les distinguer : on n'affiche donc la raison sociale que si une enseigne est donnée entre parenthèses
// (« BONBON COCO (LES GLOUGLOUTONS) » -> « Les Glougloutons »), sinon l'activité du fonds d'après son code NAF.

const NAF = [
  ["56.10A", "Restaurant"], ["56.10B", "Cafétéria"], ["56.10C", "Restauration rapide"], ["56.21", "Traiteur"],
  ["56.30", "Bar, café"], ["55.10", "Hôtel"], ["55.20", "Hébergement touristique"], ["55.30", "Camping"],
  ["10.71C", "Boulangerie-pâtisserie"], ["10.71D", "Pâtisserie"], ["10.13B", "Charcuterie"], ["47.22", "Boucherie"],
  ["47.11B", "Supérette"], ["47.11C", "Supérette"], ["47.11D", "Supermarché"], ["47.11", "Alimentation générale"],
  ["47.21", "Primeur"], ["47.23", "Poissonnerie"], ["47.24", "Boulangerie, confiserie"], ["47.25", "Cave à vins"],
  ["47.26", "Tabac, presse"], ["47.29", "Épicerie fine"], ["47.73", "Pharmacie"], ["47.71", "Boutique de vêtements"],
  ["47.72", "Chaussures, maroquinerie"], ["47.76", "Fleuriste, animalerie"], ["47.77", "Bijouterie"], ["47.62", "Librairie, presse"],
  ["47.78A", "Opticien"], ["47.78C", "Commerce de détail"], ["47.7", "Commerce de détail"], ["47.5", "Équipement de la maison"],
  ["47.6", "Loisirs, culture"], ["47.4", "Informatique, téléphonie"], ["47.3", "Station-service"], ["47.8", "Commerce sur marchés"],
  ["47", "Commerce de détail"], ["96.02A", "Salon de coiffure"], ["96.02B", "Institut de beauté"], ["96.04", "Bien-être"],
  ["96.01", "Pressing, laverie"], ["96.03", "Pompes funèbres"], ["45.20", "Garage automobile"], ["45.11", "Concession automobile"],
  ["45.3", "Équipement automobile"], ["45.4", "Moto"], ["86.23", "Cabinet dentaire"], ["86.2", "Cabinet médical"],
  ["75.00", "Clinique vétérinaire"], ["68.31", "Agence immobilière"], ["79.11", "Agence de voyages"], ["93.13", "Salle de sport"],
  ["85.53", "Auto-école"], ["74.20", "Studio photo"], ["95.2", "Atelier de réparation"], ["43", "Artisan du bâtiment"],
  ["10", "Commerce alimentaire"], ["46", "Commerce de gros"], ["49", "Transport"], ["62", "Services informatiques"],
  ["69", "Cabinet juridique, comptable"], ["70", "Conseil"], ["71", "Bureau d'études"], ["81", "Services aux bâtiments"],
];

export function activite(naf) {
  const c = String(naf || "").toUpperCase();
  if (!c || c.startsWith("00")) return "Fonds de commerce";
  for (const [p, l] of NAF) if (c.startsWith(p)) return l;
  return "Fonds de commerce";
}

const titre = (s) => s.toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());

// Le code NAF stocké est souvent celui de la société repreneuse (holding 68.20B, conseil 70.22Z…), pas du fonds.
// On lit donc d'abord le texte « activité du fonds » de l'avis BODACC, puis la verticale, et le NAF en dernier
// recours seulement pour les codes de commerce.
const MOTS = [
  [/pizz/i, "Pizzeria"], [/kebab|tacos|burger|snack|restauration rapide|à emporter/i, "Restauration rapide"],
  [/boulang/i, "Boulangerie-pâtisserie"], [/pâtiss|patiss/i, "Pâtisserie"], [/boucher/i, "Boucherie"], [/charcut/i, "Charcuterie"],
  [/hôtel|hotel/i, "Hôtel"], [/restaura|brasserie|crêperie|creperie|bistrot/i, "Restaurant"],
  [/débit de boissons|debit de boissons|\bbar\b|café|cafe|salon de thé|licence iv/i, "Bar, café"],
  [/tabac|presse/i, "Tabac, presse"], [/pharmac/i, "Pharmacie"], [/coiff/i, "Salon de coiffure"],
  [/esthéti|esthetique|beauté|beaute|onglerie|institut/i, "Institut de beauté"], [/fleur/i, "Fleuriste"],
  [/primeur|fruits et légumes/i, "Primeur"], [/épicerie|epicerie|supérette|superette|alimentation générale/i, "Épicerie"],
  [/supermarch|hypermarch/i, "Supermarché"], [/poisson/i, "Poissonnerie"], [/vins|caviste|cave à/i, "Cave à vins"],
  [/garage|mécanique|mecanique|carrosserie|réparation automobile/i, "Garage automobile"], [/lavage|station/i, "Station de lavage"],
  [/pressing|laverie|blanchisserie/i, "Pressing, laverie"], [/optique|opticien|lunett/i, "Opticien"],
  [/prêt[- ]à[- ]porter|pret a porter|vêtement|vetement|chaussure|textile/i, "Boutique de mode"], [/bijou/i, "Bijouterie"],
  [/librairie/i, "Librairie"], [/photograph/i, "Studio photo"], [/auto[- ]école/i, "Auto-école"], [/glace/i, "Glacier"],
  [/camping/i, "Camping"], [/gîte|gite|chambres d'hôtes|meublé/i, "Hébergement touristique"], [/fitness|sport/i, "Salle de sport, sport"],
];
const VERT = { chr: "Café, hôtel, restaurant", alimentaire: "Commerce alimentaire", garage_auto: "Garage automobile",
  coiffure_beaute: "Coiffure, beauté", sante: "Santé", pressing_services: "Pressing, services", fleuriste: "Fleuriste", tabac_presse: "Tabac, presse" };
const NAF_COMMERCE = /^(47|56|55|96|45|10\.7|86|75)/;

export function libellePublic(acheteurNom, naf, activiteTexte, verticale) {
  // 1. Enseigne entre parenthèses, seulement si elle diffère de la raison sociale (sinon on ne sait pas si c'est un nom)
  const m = /^(.*)\(([^()]+)\)\s*$/.exec(String(acheteurNom || ""));
  if (m) {
    const avant = m[1].trim().toUpperCase(), ens = m[2].trim();
    if (ens && !/NON-DIFFUSIBLE/i.test(ens) && ens.toUpperCase() !== avant) return titre(ens);
  }
  // 2. Activité du fonds décrite dans l'avis
  const t = String(activiteTexte || "");
  for (const [re, l] of MOTS) if (re.test(t)) return l;
  // 3. Verticale, puis NAF s'il s'agit d'un code de commerce
  if (VERT[verticale]) return VERT[verticale];
  if (NAF_COMMERCE.test(String(naf || ""))) return activite(naf);
  return "Fonds de commerce";
}
