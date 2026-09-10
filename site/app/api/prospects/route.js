const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

function sbHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
  };
}

export async function GET() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/prospects_calls?select=*&order=closer.asc,priorite.asc`,
    { headers: sbHeaders(), cache: "no-store" }
  );
  const data = await res.json();
  return Response.json(data);
}

export async function PATCH(req) {
  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return Response.json({ error: "id manquant" }, { status: 400 });
  fields.updated_at = new Date().toISOString();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/prospects_calls?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...sbHeaders(), Prefer: "return=representation" },
    body: JSON.stringify(fields),
  });
  const data = await res.json();
  return Response.json(data);
}
