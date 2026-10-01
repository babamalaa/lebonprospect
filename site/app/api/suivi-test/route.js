import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { getAuthedProfile } from "../../lib/auth";

export const dynamic = "force-dynamic";

// Suivi de l'essai Verisure : abonnés marqués suivi_test + chaque email réellement envoyé (digests_log).
// Admin uniquement.
export async function GET(req) {
  const profile = await getAuthedProfile(req);
  if (!profile) return Response.json({ error: "Non authentifié." }, { status: 401 });
  if (profile.role !== "admin") return Response.json({ error: "Accès réservé." }, { status: 403 });
  const admin = supabaseAdmin();
  const { data: subs } = await admin.from("subscribers")
    .select("id, email, nom, societe, departements, zone_label, statut, test_debut, test_fin, dernier_digest, created_at")
    .eq("suivi_test", true).order("email");
  const ids = (subs || []).map((s) => s.id);
  let logs = [];
  if (ids.length) {
    const { data } = await admin.from("digests_log")
      .select("id, subscriber_id, date_digest, nb_leads, resend_id, statut, type, sujet, edition, lead_snapshot, created_at")
      .in("subscriber_id", ids).in("type", ["bienvenue", "quotidien", "filet", "hebdo"]).order("created_at", { ascending: false }).limit(500);
    logs = data || [];
  }
  // couverture du jour : combien de reprises auraient pu être envoyées chaque jour dans leurs départements (diagnostic « jours creux »)
  const depts = [...new Set((subs || []).flatMap((s) => (Array.isArray(s.departements) ? s.departements : [])))];
  let jours = [];
  if (depts.length) {
    const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const { data } = await admin.from("cessions").select("date_parution, departement").in("departement", depts).gte("date_parution", since);
    const parJour = {};
    for (const r of data || []) { parJour[r.date_parution] = (parJour[r.date_parution] || 0) + 1; }
    // 30 jours consécutifs, zéros compris (les jours creux sont justement ceux qui déclenchent le « filet »)
    for (let i = 0; i < 30; i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      jours.push({ d, n: parJour[d] || 0 });
    }
  }
  return Response.json({ subs: subs || [], logs, jours });
}

// Renvoie le HTML exact d'un email envoyé (pour l'aperçu).
export async function POST(req) {
  const profile = await getAuthedProfile(req);
  if (!profile || profile.role !== "admin") return Response.json({ error: "Accès réservé." }, { status: 403 });
  const { id } = await req.json();
  const { data } = await supabaseAdmin().from("digests_log").select("html, sujet").eq("id", id).maybeSingle();
  return Response.json({ html: data?.html || "", sujet: data?.sujet || "" });
}
