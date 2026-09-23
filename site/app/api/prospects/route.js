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
    .or("exclu_pool.eq.false,statut.eq.mauvais_prospect")
    .order("region", { ascending: true })
    .order("nb_avis", { ascending: true });

  if (profile.role !== "admin") {
    query = query.eq("closer_id", profile.id);
  }

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 400 });

  // Prospects ayant reçu l'email « un lead gratuit » : on joint le nom de la reprise envoyée,
  // pour que le closer puisse ouvrir l'appel dessus (« vous avez reçu la reprise de X ? »).
  const leadIds = [...new Set((data || []).map((r) => r.outreach_lead_id).filter(Boolean))];
  if (leadIds.length) {
    const { data: leads } = await admin.from("cessions").select("id, commercant, ville, date_parution").in("id", leadIds);
    const byId = Object.fromEntries((leads || []).map((l) => [l.id, l]));
    for (const r of data) {
      const l = r.outreach_lead_id ? byId[r.outreach_lead_id] : null;
      r.outreach_lead = l ? { commercant: (l.commercant || "").split(",")[0], ville: (l.ville || "").split(",")[0], date: l.date_parution } : null;
    }
  }
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
  if (fields.statut === "signe" && !fields.signed_at) {
    fields.signed_at = new Date().toISOString();
  }
  // "Mauvais prospect" : on retire definitivement du vivier (jamais redistribue a un autre closer)
  if (fields.statut === "mauvais_prospect") {
    fields.exclu_pool = true;
    fields.exclu_raison = fields.exclu_raison || "mauvais_prospect";
    fields.exclu_par = profile.id;
    fields.exclu_at = new Date().toISOString();
  }
  const { data, error } = await admin
    .from("prospects_pool")
    .update(fields)
    .eq("id", id)
    .select();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data);
}
