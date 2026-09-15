import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { getAuthedProfile } from "../../lib/auth";

export async function GET(req) {
  const profile = await getAuthedProfile(req);
  if (!profile) return Response.json({ error: "Non authentifié." }, { status: 401 });
  if (profile.role !== "admin") return Response.json({ error: "Réservé aux admins." }, { status: 403 });

  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("closer_profiles")
    .select("id, full_name, email, role")
    .eq("role", "closer")
    .order("full_name", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data || []);
}
