import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { getAuthedProfile } from "../../lib/auth";

export async function GET(req) {
  const profile = await getAuthedProfile(req);
  if (!profile) return Response.json({ error: "Non authentifié." }, { status: 401 });

  const admin = supabaseAdmin();
  let query = admin
    .from("prospects_pool")
    .select("*")
    .not("closer_id", "is", null)
    .order("region", { ascending: true })
    .order("nb_avis", { ascending: true });

  if (profile.role !== "admin") {
    query = query.eq("closer_id", profile.id);
  }

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data);
}

export async function PATCH(req) {
  const profile = await getAuthedProfile(req);
  if (!profile) return Response.json({ error: "Non authentifié." }, { status: 401 });

  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return Response.json({ error: "id manquant." }, { status: 400 });

  const admin = supabaseAdmin();

  // vérifie que ce prospect appartient bien au closer (sauf admin)
  if (profile.role !== "admin") {
    const { data: row } = await admin.from("prospects_pool").select("closer_id").eq("id", id).single();
    if (!row || row.closer_id !== profile.id) {
      return Response.json({ error: "Ce prospect ne vous appartient pas." }, { status: 403 });
    }
  }

  fields.updated_at = new Date().toISOString();
  const { data, error } = await admin
    .from("prospects_pool")
    .update(fields)
    .eq("id", id)
    .select();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data);
}
