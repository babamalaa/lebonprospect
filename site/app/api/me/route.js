import { supabaseAdmin } from "../../lib/supabaseAdmin";

async function getUserFromToken(req) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace("Bearer ", "");
  if (!token) return null;
  const admin = supabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

export async function GET(req) {
  const user = await getUserFromToken(req);
  if (!user) return Response.json({ error: "Non authentifié." }, { status: 401 });

  const admin = supabaseAdmin();
  const { data: profile, error } = await admin
    .from("closer_profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(profile);
}
