import crypto from "crypto";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Webhooks Resend (signés par Svix) : statut réel de chaque email (livré, rejeté, signalé spam, retardé, ouvert).
// Le 5 nov. 2026, on n'a pas pu répondre à « ils n'ont rien reçu » : la clé Resend ne sait qu'envoyer.
// Ici, chaque événement est vérifié (signature + horodatage), enregistré une seule fois (svix_id unique),
// et un rejet ou une plainte sur un abonné déclenche une alerte immédiate.

const TOLERANCE_S = 5 * 60;

function verifier(rawBody, headers) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const id = headers.get("svix-id");
  const ts = headers.get("svix-timestamp");
  const sigs = headers.get("svix-signature");
  if (!secret || !id || !ts || !sigs) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > TOLERANCE_S) return false;          // rejoue d'un vieil événement
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const attendu = crypto.createHmac("sha256", key).update(`${id}.${ts}.${rawBody}`).digest("base64");
  const a = Buffer.from(attendu);
  return sigs.split(" ").some((s) => {
    const v = s.split(",")[1];
    if (!v) return false;
    const b = Buffer.from(v);
    return b.length === a.length && crypto.timingSafeEqual(a, b);
  });
}

async function alerter(admin, ev) {
  // Un abonné (essai ou payant) dont le mail est rejeté ou signalé comme spam : on prévient tout de suite.
  const to = (ev.data?.to || [])[0] || "";
  const { data: sub } = await admin.from("subscribers").select("id, email, suivi_test").eq("email", to.toLowerCase()).maybeSingle();
  if (!sub) return;
  const quoi = ev.type === "email.bounced" ? "REJETÉ par le serveur du destinataire" : "SIGNALÉ COMME SPAM par le destinataire";
  const raison = ev.data?.bounce?.message || ev.data?.bounce?.subType || "";
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "LeBonProspect <alerte@lebonprospect.fr>",
      to: ["baptportugal@gmail.com"],
      subject: `[ALERTE] Email ${ev.type === "email.bounced" ? "rejeté" : "signalé spam"} : ${to}`,
      html: `<p>Un email envoyé à <b>${to}</b>${sub.suivi_test ? " (essai Verisure)" : ""} a été <b>${quoi}</b>.</p>`
        + `<p>Objet : ${(ev.data?.subject || "").replace(/</g, "&lt;")}<br>Identifiant Resend : ${ev.data?.email_id}</p>`
        + (raison ? `<p>Raison donnée : <code>${String(raison).replace(/</g, "&lt;")}</code></p>` : ""),
    }),
  }).catch(() => {});
}

export async function POST(req) {
  const raw = await req.text();
  if (!verifier(raw, req.headers)) return new Response("signature invalide", { status: 401 });
  let ev;
  try { ev = JSON.parse(raw); } catch { return new Response("json invalide", { status: 400 }); }
  const admin = supabaseAdmin();
  const row = {
    svix_id: req.headers.get("svix-id"),
    resend_id: ev.data?.email_id || "",
    type: ev.type || "inconnu",
    destinataire: (ev.data?.to || [])[0] || null,
    sujet: ev.data?.subject || null,
    detail: ev.data || null,
  };
  const { error } = await admin.from("email_events").insert(row);
  if (error && !String(error.message).includes("duplicate")) {
    return new Response("erreur base", { status: 500 });        // Resend réessaiera
  }
  if (!error && (ev.type === "email.bounced" || ev.type === "email.complained")) await alerter(admin, ev);
  return Response.json({ ok: true });
}
