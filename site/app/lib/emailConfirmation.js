// Email de confirmation envoyé AU CLIENT dans la seconde qui suit le paiement (décision du 11 nov. 2026).
// Rendu compatible messageries (tables, styles en ligne). Une seule source : la page d'aperçu utilise la même fonction.
const TEAL = "#31777A", INK = "#14181d", MUTED = "#6f6a5c", LINE = "#e6e0d0", PAPER = "#fdfbf5";
const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export const PLAN_LABEL = { departemental: "Départemental", regional: "Régional", national: "National" };

// zone : { type: "departement" | "region", nom } ou null (non reconnue) ; national : plan === "national"
export function confirmationClient({ prenom, plan, zone, zoneSaisie, metier, essai }) {
  const offre = PLAN_LABEL[plan] || plan || "";
  const zoneTxt = plan === "national" ? "France entière (à préciser avec vous)"
    : zone ? (zone.type === "region" ? `Région ${zone.nom}` : zone.nom) : null;
  const automatique = !!zone && plan !== "national";
  const suite = automatique
    ? `Dans quelques minutes, vous recevez une première édition avec les reprises publiées ces 14 derniers jours dans votre zone. Ensuite, chaque matin, le jour de la publication au Journal officiel, les nouvelles reprises arrivent ici avant 8h.`
    : `Nous n'avons pas pu lire votre zone automatiquement${zoneSaisie ? ` (« ${esc(zoneSaisie)} »)` : ""}. Lawrenza vous écrit dans la journée pour la confirmer ; votre première édition part dès que c'est fait.`;
  const ligne = (k, v) => `<tr><td style="padding:6px 16px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${MUTED};white-space:nowrap;vertical-align:top;">${k}</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${INK};"><b>${v}</b></td></tr>`;
  const subject = essai ? "Votre essai LeBonProspect est activé" : "Votre abonnement LeBonProspect est confirmé";
  const html = `<!doctype html><html lang="fr"><body style="margin:0;padding:0;background:${PAPER};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${PAPER}"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid ${LINE};border-radius:12px;">
<tr><td style="padding:24px 28px 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:${TEAL};">LeBonProspect</td></tr>
<tr><td style="padding:0 28px;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:28px;font-weight:bold;color:${INK};">${essai ? "Votre essai est activé" : "Votre abonnement est confirmé"}</td></tr>
<tr><td style="padding:12px 28px 4px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:23px;color:${INK};">
Bonjour${prenom ? " " + esc(prenom) : ""},<br><br>Merci, ${essai ? "votre essai de 7 jours est lancé : vous ne serez débité qu'à la fin de l'essai, et seulement si vous continuez." : "votre paiement est bien passé."} Voici ce que nous avons enregistré :</td></tr>
<tr><td style="padding:8px 28px;"><table role="presentation" cellpadding="0" cellspacing="0">
${ligne("Offre", esc(offre))}
${ligne("Zone", zoneTxt ? esc(zoneTxt) : "à confirmer")}
${ligne("Métier", esc(metier || "non précisé"))}
</table></td></tr>
<tr><td style="padding:8px 28px 4px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:23px;color:${INK};">${suite}</td></tr>
<tr><td style="padding:12px 28px 4px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:${INK};">
Une erreur sur la zone ou le métier ? Répondez simplement à cet email, on corrige dans la journée.<br>
Factures, carte bancaire, résiliation : <a href="https://www.lebonprospect.fr/mon-compte" style="color:${TEAL};">lebonprospect.fr/mon-compte</a></td></tr>
<tr><td style="padding:16px 28px 24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:${INK};">Baptiste et Lawrenza<br><span style="color:${MUTED};">LeBonProspect</span></td></tr>
</table></td></tr></table></body></html>`;
  return { subject, html, automatique };
}
