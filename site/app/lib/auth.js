import { supabaseAdmin } from "./supabaseAdmin";

export async function getAuthedUser(req) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace("Bearer ", "");
  if (!token) return null;
  const admin = supabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

export async function getAuthedProfile(req) {
  const user = await getAuthedUser(req);
  if (!user) return null;
  const admin = supabaseAdmin();
  const { data: profile } = await admin
    .from("closer_profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return profile || null;
}
