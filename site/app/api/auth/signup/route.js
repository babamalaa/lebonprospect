import { supabaseAdmin } from "../../../lib/supabaseAdmin";

const INVITE_CODES = {
  "lbp-closer-2026": "closer",
  "lbp-admin-2026": "admin",
};

export async function POST(req) {
  const { email, password, full_name, invite_code } = await req.json();

  if (!email || !password || !full_name || !invite_code) {
    return Response.json({ error: "Champs manquants." }, { status: 400 });
  }
  const role = INVITE_CODES[invite_code.trim()];
  if (!role) {
    return Response.json({ error: "Code d'invitation invalide." }, { status: 403 });
  }
  if (password.length < 8) {
    return Response.json({ error: "Mot de passe trop court (8 caractères minimum)." }, { status: 400 });
  }

  const admin = supabaseAdmin();

  const { data: userData, error: userErr } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
  });
  if (userErr) {
    const msg = userErr.message?.includes("already been registered")
      ? "Un compte existe déjà avec cet email."
      : userErr.message;
    return Response.json({ error: msg }, { status: 400 });
  }

  const { error: profileErr } = await admin.from("closer_profiles").insert({
    id: userData.user.id,
    full_name: full_name.trim(),
    email: email.trim().toLowerCase(),
    role,
  });
  if (profileErr) {
    return Response.json({ error: profileErr.message }, { status: 400 });
  }

  return Response.json({ ok: true, role });
}
