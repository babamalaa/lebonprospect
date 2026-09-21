import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { getAuthedProfile } from "../../lib/auth";

export const dynamic = "force-dynamic";

// Régions où il reste des prospects libres, avec le compte (pour les boutons de réassort)
export async function GET(req) {
  const profile = await getAuthedProfile(req);
  if (!profile) return Response.json({ error: "Non authentifié." }, { status: 401 });
  const admin = supabaseAdmin();
  const { data, error } = await admin.rpc("pool_by_region");
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json((data || []).map((r) => ({ region: r.region, n: Number(r.n) })));
}
