// Typographie française de la home : apostrophes typographiques et espaces insécables.
// Écart assumé avec le brief : séparateur de milliers en espace insécable normale (U+00A0) et non fine (U+202F),
// car Inter Tight rend l'espace fine presque invisible (« 3923 » à l'écran, constaté le 9 nov. 2026).
const NBSP = "\u00a0";

export function fr(s) {
  if (s == null) return s;
  return String(s)
    .replace(/'/g, "\u2019")
    .replace(/ ([:;?!%€»])/g, `${NBSP}$1`)
    .replace(/« /g, `«${NBSP}`)
    .replace(/(\d) (\d{3})\b/g, `$1${NBSP}$2`)
    .replace(/(\d) (mois|jours|clic|€)/g, `$1${NBSP}$2`)
    .replace(/(J\+\d+)([,.])/g, `$1$2`);
}

export function nombre(n) {
  return Number(n || 0).toLocaleString("fr-FR").replace(/[\u202f\u00a0 ]/g, NBSP);
}
