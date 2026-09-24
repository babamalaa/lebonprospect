import { resolveZone } from "./geo";

export const ESSAI_JOURS = 7;

/** Construit la ligne subscribers pour un essai démarré depuis le dashboard.
 *  Retourne { row } ou { error } (jamais les deux). now = Date injectable pour les tests. */
export function buildEssaiSubscriber(prospect, plan, now = new Date()) {
  const email = (prospect.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) return { error: "Ce prospect n'a pas d'email : impossible de démarrer l'essai." };
  if (!["departemental", "regional"].includes(plan)) return { error: "L'essai n'existe qu'en Départemental ou Régional." };
  const zone = resolveZone(prospect.region || "", plan);
  if (!zone) return { error: `Zone non reconnue pour ce prospect (« ${prospect.region || ""} »).` };
  if (plan === "departemental" && zone.type !== "departement") return { error: "Plan Départemental mais la zone du prospect est une région : choisissez Régional." };
  const fin = new Date(now.getTime() + ESSAI_JOURS * 86400000);
  return {
    row: {
      email,
      nom: null,
      societe: prospect.societe || null,
      plan,
      verticales: ["chr"],
      regions: zone.type === "region" ? [zone.nom] : null,
      departements: zone.type === "departement" ? [zone.nom] : null,
      statut: "actif",
      essai: true,
      essai_fin: fin.toISOString(),
      essai_source: "dashboard",
      source: "dashboard_essai",
      telephone: prospect.telephone || null,
      secteur: prospect.categorie || null,
      zone_saisie: prospect.region || null,
    },
  };
}

/** Motif de refus d'un essai pour la ligne subscribers existante du même email, ou null si l'essai peut démarrer.
 *  Un abonné payant, actif (payant ou en essai) ou ayant déjà eu un essai n'est jamais écrasé. */
export function essaiRefuse(existing) {
  if (!existing) return null;
  if (existing.premier_paiement_at || existing.statut === "actif") return "Cet email est déjà abonné (ou déjà en essai). Pas de nouvel essai.";
  if (existing.essai) return "Cet email a déjà eu un essai gratuit. Pas de second essai : proposez l'abonnement.";
  return null;
}
