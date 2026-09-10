import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { getAuthedProfile } from "../../lib/auth";

const BATCH_SIZE = 15;

export async function POST(req) {
  const profile = await getAuthedProfile(req);
  if (!profile) return Response.json({ error: "Non authentifié." }, { status: 401 });

  const { region } = await req.json().catch(() => ({}));
  const admin = supabaseAdmin();

  let query = admin
    .from("prospects_pool")
    .select("id")
    .is("closer_id", null)
    .order("nb_avis", { ascending: true })
    .limit(BATCH_SIZE);

  if (region) query = query.eq("region", region);

  const { data: rows, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 400 });

  if (!rows || rows.length === 0) {
    return Response.json({ ok: true, n: 0, message: "Plus aucun prospect disponible dans ce périmètre pour le moment." });
  }

  const ids = rows.map((r) => r.id);
  const { error: updateErr } = await admin
    .from("prospects_pool")
    .update({ closer_id: profile.id, claimed_at: new Date().toISOString() })
    .in("id", ids);

  if (updateErr) return Response.json({ error: updateErr.message }, { status: 400 });

  return Response.json({ ok: true, n: ids.length });
}
