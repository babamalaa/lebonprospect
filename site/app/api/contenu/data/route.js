import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { getAuthedProfile } from "../../../lib/auth";

export const dynamic = "force-dynamic";

// Chiffres réels de la base pour le générateur de contenu. Tout est vérifiable au BODACC.
export async function GET(req) {
  const profile = await getAuthedProfile(req);
  if (!profile) return Response.json({ error: "Non authentifié." }, { status: 401 });
  const admin = supabaseAdmin();
  const { data, error } = await admin.rpc("contenu_stats");
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data);
}
