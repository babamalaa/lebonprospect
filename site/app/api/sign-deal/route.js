import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { getAuthedProfile } from "../../lib/auth";

const PLAN_PRICE = { departemental: 149, regional: 299, national: 0 };
const PLAN_LABEL = { departemental: "Départemental (149€/mois)", regional: "Régional (299€/mois)", national: "National (sur devis)" };

async function sendResend(to, subject, html) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "LeBonProspect <onboarding@lebonprospect.fr>",
      to: [to],
      subject,
      html,
    }),
  });
}

export async function POST(req) {
  const profile = await getAuthedProfile(req);
  if (!profile) return Response.json({ error: "Non authentifié." }, { status: 401 });

  const { prospect_id, plan } = await req.json();
  if (!prospect_id || !plan) return Response.json({ error: "prospect_id et plan requis." }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: prospect, error: pErr } = await admin.from("prospects_pool").select("*").eq("id", prospect_id).single();
  if (pErr || !prospect) return Response.json({ error: "Prospect introuvable." }, { status: 404 });
  if (profile.role !== "admin" && prospect.closer_id !== profile.id) {
    return Response.json({ error: "Ce prospect ne vous appartient pas." }, { status: 403 });
  }

  const montant = PLAN_PRICE[plan] ?? 0;
  const { error: uErr } = await admin
    .from("prospects_pool")
    .update({ statut: "signe", plan, montant, signed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", prospect_id);
  if (uErr) return Response.json({ error: uErr.message }, { status: 400 });

  // Notification email à Lawrenza — best-effort, ne bloque jamais la réponse
  try {
    await sendResend(
      "belinlawrenza@gmail.com",
      `🎉 Deal signé : ${prospect.societe}`,
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#31777A">Nouveau deal signé !</h2>
        <p><b>${profile.full_name}</b> vient de signer <b>${prospect.societe}</b>.</p>
        <table style="width:100%;font-size:14px;margin-top:12px">
          <tr><td style="color:#666;padding:4px 0">Formule</td><td><b>${PLAN_LABEL[plan] || plan}</b></td></tr>
          <tr><td style="color:#666;padding:4px 0">Zone</td><td>${prospect.region || "-"}${prospect.ville ? " · " + prospect.ville : ""}</td></tr>
          <tr><td style="color:#666;padding:4px 0">Catégorie</td><td>${prospect.categorie || "-"}</td></tr>
          <tr><td style="color:#666;padding:4px 0">Téléphone</td><td>${prospect.telephone || "-"}</td></tr>
        </table>
        <p style="margin-top:16px;color:#888;font-size:12px">Reste à activer l'abonnement Stripe côté client.</p>
      </div>`
    );
  } catch (e) {
    // silencieux : le deal est signé même si l'email échoue
  }

  return Response.json({ ok: true });
}
