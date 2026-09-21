import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { getAuthedProfile } from "../../lib/auth";

export const dynamic = "force-dynamic";

// Suivi des essais gratuits 7 jours (source : webhook Stripe -> subscribers)
export async function GET(req) {
  const profile = await getAuthedProfile(req);
  if (!profile) return Response.json({ error: "Non authentifié." }, { status: 401 });
  if (profile.role !== "admin" && !profile.essai_autorise) return Response.json({ error: "Réservé." }, { status: 403 });
  const admin = supabaseAdmin();
  const { data, error } = await admin.from("subscribers")
    .select("email, nom, societe, plan, essai_fin, premier_paiement_at, resilie_at, stripe_status, statut, created_at, zone_saisie, regions, departements")
    .eq("essai", true).order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  const now = Date.now();
  const rows = (data || []).map((r) => {
    let etat = "en_cours";
    if (r.premier_paiement_at) etat = "converti";
    else if (r.resilie_at || r.stripe_status === "canceled") etat = "resilie";
    else if (r.essai_fin && new Date(r.essai_fin).getTime() < now) etat = "fin_essai_attente";
    return { ...r, etat, zone: (r.regions && r.regions[0]) || (r.departements && r.departements[0]) || r.zone_saisie || null };
  });
  const stats = {
    total: rows.length,
    en_cours: rows.filter((r) => r.etat === "en_cours").length,
    convertis: rows.filter((r) => r.etat === "converti").length,
    resilies: rows.filter((r) => r.etat === "resilie").length,
  };
  stats.taux_conversion = stats.convertis + stats.resilies > 0 ? Math.round((100 * stats.convertis) / (stats.convertis + stats.resilies)) : null;
  return Response.json({ stats, rows });
}
