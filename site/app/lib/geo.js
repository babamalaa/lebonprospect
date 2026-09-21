// Référentiel géographique pour normaliser la zone saisie au checkout Stripe.
// Les libellés doivent être EXACTEMENT ceux de la table cessions.
export const DEPARTEMENTS = ["Ain", "Aisne", "Allier", "Alpes-de-Haute-Provence", "Alpes-Maritimes", "Ardèche", "Ardennes", "Ariège", "Aube", "Aude", "Aveyron", "Bas-Rhin", "Bouches-du-Rhône", "Calvados", "Cantal", "Charente", "Charente-Maritime", "Cher", "Corrèze", "Corse-du-Sud", "Côte-d'Or", "Côtes-d'Armor", "Creuse", "Deux-Sèvres", "Dordogne", "Doubs", "Drôme", "Essonne", "Eure", "Eure-et-Loir", "Finistère", "Gard", "Gers", "Gironde", "Guadeloupe", "Guyane", "Haut-Rhin", "Haute-Corse", "Haute-Garonne", "Haute-Loire", "Haute-Marne", "Haute-Saône", "Haute-Savoie", "Haute-Vienne", "Hautes-Alpes", "Hautes-Pyrénées", "Hauts-de-Seine", "Hérault", "Ille-et-Vilaine", "Indre", "Indre-et-Loire", "Isère", "Jura", "La Réunion", "Landes", "Loir-et-Cher", "Loire", "Loire-Atlantique", "Loiret", "Lot", "Lot-et-Garonne", "Lozère", "Maine-et-Loire", "Manche", "Marne", "Martinique", "Mayenne", "Mayotte", "Meurthe-et-Moselle", "Meuse", "Morbihan", "Moselle", "Nièvre", "Nord", "Oise", "Orne", "Paris", "Pas-de-Calais", "Puy-de-Dôme", "Pyrénées-Atlantiques", "Pyrénées-Orientales", "Rhône", "Saint-Pierre-et-Miquelon", "Saône-et-Loire", "Sarthe", "Savoie", "Seine-et-Marne", "Seine-Maritime", "Seine-Saint-Denis", "Somme", "Tarn", "Tarn-et-Garonne", "Territoire de Belfort", "Val-d'Oise", "Val-de-Marne", "Var", "Vaucluse", "Vendée", "Vienne", "Vosges", "Yonne", "Yvelines"];
export const REGIONS = ["Auvergne-Rhône-Alpes", "Bourgogne-Franche-Comté", "Bretagne", "Centre-Val de Loire", "Corse", "Grand Est", "Guadeloupe", "Guyane", "Hauts-de-France", "Île-de-France", "La Réunion", "Martinique", "Mayotte", "Normandie", "Nouvelle-Aquitaine", "Occitanie", "Pays de la Loire", "Provence-Alpes-Côte d'Azur", "Saint-Pierre-et-Miquelon"];
export const DEP_BY_CODE = {"01": "Ain", "02": "Aisne", "03": "Allier", "04": "Alpes-de-Haute-Provence", "05": "Hautes-Alpes", "06": "Alpes-Maritimes", "07": "Ardèche", "08": "Ardennes", "09": "Ariège", "10": "Aube", "11": "Aude", "12": "Aveyron", "13": "Bouches-du-Rhône", "14": "Calvados", "15": "Cantal", "16": "Charente", "17": "Charente-Maritime", "18": "Cher", "19": "Corrèze", "2A": "Corse-du-Sud", "2B": "Haute-Corse", "21": "Côte-d'Or", "22": "Côtes-d'Armor", "23": "Creuse", "24": "Dordogne", "25": "Doubs", "26": "Drôme", "27": "Eure", "28": "Eure-et-Loir", "29": "Finistère", "30": "Gard", "31": "Haute-Garonne", "32": "Gers", "33": "Gironde", "34": "Hérault", "35": "Ille-et-Vilaine", "36": "Indre", "37": "Indre-et-Loire", "38": "Isère", "39": "Jura", "40": "Landes", "41": "Loir-et-Cher", "42": "Loire", "43": "Haute-Loire", "44": "Loire-Atlantique", "45": "Loiret", "46": "Lot", "47": "Lot-et-Garonne", "48": "Lozère", "49": "Maine-et-Loire", "50": "Manche", "51": "Marne", "52": "Haute-Marne", "53": "Mayenne", "54": "Meurthe-et-Moselle", "55": "Meuse", "56": "Morbihan", "57": "Moselle", "58": "Nièvre", "59": "Nord", "60": "Oise", "61": "Orne", "62": "Pas-de-Calais", "63": "Puy-de-Dôme", "64": "Pyrénées-Atlantiques", "65": "Hautes-Pyrénées", "66": "Pyrénées-Orientales", "67": "Bas-Rhin", "68": "Haut-Rhin", "69": "Rhône", "70": "Haute-Saône", "71": "Saône-et-Loire", "72": "Sarthe", "73": "Savoie", "74": "Haute-Savoie", "75": "Paris", "76": "Seine-Maritime", "77": "Seine-et-Marne", "78": "Yvelines", "79": "Deux-Sèvres", "80": "Somme", "81": "Tarn", "82": "Tarn-et-Garonne", "83": "Var", "84": "Vaucluse", "85": "Vendée", "86": "Vienne", "87": "Haute-Vienne", "88": "Vosges", "89": "Yonne", "90": "Territoire de Belfort", "91": "Essonne", "92": "Hauts-de-Seine", "93": "Seine-Saint-Denis", "94": "Val-de-Marne", "95": "Val-d'Oise", "971": "Guadeloupe", "972": "Martinique", "973": "Guyane", "974": "La Réunion", "976": "Mayotte"};

const fold = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const ALIASES = {
  "idf": "Île-de-France", "ile de france": "Île-de-France", "paca": "Provence-Alpes-Côte d'Azur", "aura": "Auvergne-Rhône-Alpes",
  "rhone alpes": "Auvergne-Rhône-Alpes", "auvergne": "Auvergne-Rhône-Alpes", "cote d azur": "Provence-Alpes-Côte d'Azur", "provence": "Provence-Alpes-Côte d'Azur",
  "nord pas de calais": "Hauts-de-France", "picardie": "Hauts-de-France", "alsace": "Grand Est", "lorraine": "Grand Est", "champagne": "Grand Est",
  "aquitaine": "Nouvelle-Aquitaine", "midi pyrenees": "Occitanie", "languedoc": "Occitanie", "bourgogne": "Bourgogne-Franche-Comté", "franche comte": "Bourgogne-Franche-Comté",
  "centre": "Centre-Val de Loire", "pays de loire": "Pays de la Loire", "reunion": "La Réunion",
};

/** Retourne { type: "region"|"departement", nom } ou null si non reconnu. */
export function resolveZone(raw, plan) {
  const f = fold(raw);
  if (!f) return null;
  // 1. code département (69, "Rhône, 69", "69 Rhône", 2A...)
  const code = (raw || "").match(/\b(2a|2b|97[1-6]|\d{2})\b/i);
  if (plan === "departemental" && code && DEP_BY_CODE[code[1].toUpperCase()]) return { type: "departement", nom: DEP_BY_CODE[code[1].toUpperCase()] };
  // 2. nom exact (accents/casse ignorés)
  const regs = REGIONS.map((r) => [fold(r), r]); const deps = DEPARTEMENTS.map((d) => [fold(d), d]);
  const list = plan === "regional" ? [...regs, ...deps] : [...deps, ...regs];
  for (const [k, v] of list) if (k === f) return { type: REGIONS.includes(v) ? "region" : "departement", nom: v };
  // 3. alias régionaux
  if (ALIASES[f]) return { type: "region", nom: ALIASES[f] };
  // 4. inclusion (ex : "departement du rhone", "region occitanie")
  for (const [k, v] of list) if (k.length >= 4 && (f.includes(k) || k.includes(f))) return { type: REGIONS.includes(v) ? "region" : "departement", nom: v };
  for (const [k, v] of Object.entries(ALIASES)) if (f.includes(k)) return { type: "region", nom: v };
  return null;
}
