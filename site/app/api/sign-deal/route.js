import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { getAuthedProfile } from "../../lib/auth";
import { buildEssaiSubscriber, essaiRefuse } from "../../lib/essai";

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

  const { prospect_id, plan, essai = false } = await req.json();
  if (!prospect_id || !plan) return Response.json({ error: "prospect_id et plan requis." }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: prospect, error: pErr } = await admin.from("prospects_pool").select("*").eq("id", prospect_id).single();
  if (pErr || !prospect) return Response.json({ error: "Prospect introuvable." }, { status: 404 });
  if (profile.role !== "admin" && prospect.closer_id !== profile.id) {
    return Response.json({ error: "Ce prospect ne vous appartient pas." }, { status: 403 });
  }

  if (essai && !profile.essai_autorise) return Response.json({ error: "Essai non autorisé sur ce compte." }, { status: 403 });

  let subscriberId = null;
  if (essai) {
    const { row, error: bErr } = buildEssaiSubscriber(prospect, plan);
    if (bErr) return Response.json({ error: bErr }, { status: 400 });
    // Un abonné payant ou déjà en essai ne doit jamais être écrasé par un essai.
    const { data: existing, error: eErr } = await admin.from("subscribers").select("id, essai, premier_paiement_at, statut").eq("email", row.email).maybeSingle();
    if (eErr) return Response.json({ error: eErr.message }, { status: 400 });
    const refus = essaiRefuse(existing);
    if (refus) return Response.json({ error: refus }, { status: 409 });
    const { data: created, error: sErr } = await admin.from("subscribers").upsert(row, { onConflict: "email" }).select("id").single();
    if (sErr) return Response.json({ error: sErr.message }, { status: 400 });
    subscriberId = created.id;
  }

  const montant = PLAN_PRICE[plan] ?? 0;
  const { error: uErr } = await admin
    .from("prospects_pool")
    .update({ statut: "signe", plan, montant, essai: !!essai, ...(essai ? { subscriber_id: subscriberId } : {}), signed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", prospect_id);
  if (uErr) return Response.json({ error: uErr.message }, { status: 400 });

  // Notification email à Lawrenza — best-effort, ne bloque jamais la réponse
  try {
    await sendResend(
      "belinlawrenza@gmail.com",
      `${essai ? "Essai 7 jours démarré" : "🎉 Deal signé"} : ${prospect.societe}`,
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#31777A">Nouveau deal signé !</h2>
        <p><b>${profile.full_name}</b> vient de signer <b>${prospect.societe}</b>.</p>
        <table style="width:100%;font-size:14px;margin-top:12px">
          <tr><td style="color:#666;padding:4px 0">Formule</td><td><b>${PLAN_LABEL[plan] || plan}</b></td></tr>
          <tr><td style="color:#666;padding:4px 0">Zone</td><td>${prospect.region || "-"}${prospect.ville ? " · " + prospect.ville : ""}</td></tr>
          <tr><td style="color:#666;padding:4px 0">Catégorie</td><td>${prospect.categorie || "-"}</td></tr>
          <tr><td style="color:#666;padding:4px 0">Téléphone</td><td>${prospect.telephone || "-"}</td></tr>
        </table>
        <p style="margin-top:16px;color:#888;font-size:12px">${essai ? "Essai démarré : premier digest demain 8h. Rappel carte automatique à J+5." : "Reste à activer l'abonnement Stripe côté client."}</p>
      </div>`
    );
  } catch (e) {
    // silencieux : le deal est signé même si l'email échoue
  }

  return Response.json({ ok: true, essai_demarre: !!essai, subscriber_id: subscriberId });
}
