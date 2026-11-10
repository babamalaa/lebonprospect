// Badge unique (décision du 11 nov. 2026), identique au site, à l'email et aux teasers (pipeline/digest.py, badge_age) :
// société repreneuse créée moins de 180 jours avant la publication de la reprise.
export const SEUIL_NEUF_JOURS = 180;
export const BADGE_NEUF = "société de moins de 6 mois";
export const BADGE_ETABLI = "acquéreur établi";

export function badgeAge(dateCreation, dateParution) {
  if (!dateCreation) return null;
  const ref = dateParution ? new Date(dateParution) : new Date();
  return (ref - new Date(dateCreation)) / 86400000 <= SEUIL_NEUF_JOURS ? BADGE_NEUF : BADGE_ETABLI;
}

export const urlAnnonce = (bodaccId) => (bodaccId ? `https://www.bodacc.fr/pages/annonces-commerciales-detail/?q.id=id:${bodaccId}` : null);
