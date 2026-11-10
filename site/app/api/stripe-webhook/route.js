import Stripe from "stripe";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { resolveZone } from "../../lib/geo";
import { confirmationClient } from "../../lib/emailConfirmation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);


const EQUIPE = ["belinlawrenza@gmail.com"];
const PLAN_LABEL = { departemental: "Départemental", regional: "Régional", national: "National" };
const eur = (c) => (c == null ? "" : `${(c / 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`);
const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

async function sendMail(to, subject, html, from = "LeBonProspect <onboarding@lebonprospect.fr>", replyTo = null) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: Array.isArray(to) ? to : [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
}

// Retrouve le closer et le prospect à partir de client_reference_id (« cl_<uuid> » depuis le dashboard, « pg_<slug> » depuis une page /pour/).
async function resolveCloser(admin, ref) {
  if (!ref) return { closer: null, societe: null, slug: null };
  if (ref.startsWith("cl_")) {
    const { data } = await admin.from("closer_profiles").select("id, full_name, email").eq("id", ref.slice(3)).maybeSingle();
    return { closer: data || null, societe: null, slug: null };
  }
  if (ref.startsWith("pg_")) {
    const slug = ref.slice(3);
    const { data: page } = await admin.from("generated_pages").select("societe, closer_id").eq("slug", slug).maybeSingle();
    // Le deal revient au closer qui SUIT le prospect, pas à celui qui a généré la page (l'outreach automatique génère sous le compte de Law).
    let closerId = page?.closer_id || null;
    if (page?.societe) {
      const { data: prospect } = await admin.from("prospects_pool").select("closer_id").ilike("societe", page.societe).limit(1).maybeSingle();
      if (prospect?.closer_id) closerId = prospect.closer_id;
    }
    if (closerId) {
      const { data } = await admin.from("closer_profiles").select("id, full_name, email").eq("id", closerId).maybeSingle();
      return { closer: data || null, societe: page?.societe || null, slug };
    }
    return { closer: null, societe: page?.societe || null, slug };
  }
  return { closer: null, societe: null, slug: null };
}

// Notifie le closer (confirmation que le paiement est réellement passé) et l'équipe.
async function notifyDeal(admin, session, row) {
  const ref = session.client_reference_id || "";
  const { closer, societe, slug } = await resolveCloser(admin, ref);
  const { data: existing } = await admin.from("subscribers").select("notif_deal_at").eq("email", row.email).maybeSingle();
  if (existing?.notif_deal_at) return { notif: "deja_envoyee" };   // Stripe rejoue parfois un événement
  await admin.from("subscribers").update({ closer_id: closer?.id || null, prospect_slug: slug, notif_deal_at: new Date().toISOString() }).eq("email", row.email);

  const plan = PLAN_LABEL[row.plan] || row.plan || "";
  const montant = session.amount_total != null && !row.essai ? eur(session.amount_total) : "";
  const quoi = row.essai ? `essai gratuit de 7 jours lancé (carte enregistrée)` : `paiement encaissé${montant ? " : " + montant : ""}`;
  const nom = societe || row.societe || session.customer_details?.name || row.email;
  const zone = row.zone_saisie || "zone non renseignée";
  const lignes = `
    <p style="font-size:15px;margin:0 0 10px"><b>${esc(nom)}</b> vient de souscrire.</p>
    <table style="font-size:14px;border-collapse:collapse">
      <tr><td style="padding:3px 14px 3px 0;color:#6f6a5c">Offre</td><td><b>${esc(plan)}</b></td></tr>
      <tr><td style="padding:3px 14px 3px 0;color:#6f6a5c">Statut</td><td>${esc(quoi)}</td></tr>
      <tr><td style="padding:3px 14px 3px 0;color:#6f6a5c">Zone saisie</td><td>${esc(zone)}</td></tr>
      <tr><td style="padding:3px 14px 3px 0;color:#6f6a5c">Contact</td><td>${esc(row.email)}${row.telephone ? " · " + esc(row.telephone) : ""}</td></tr>
    </table>`;
  const sent = [];
  if (closer?.email) {
    await sendMail(closer.email, `Deal confirmé : ${nom}`, `<div style="font-family:Inter,Arial,sans-serif;color:#14181d;max-width:520px">
      <p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#31777A;font-weight:700;margin:0 0 6px">Deal confirmé par Stripe</p>${lignes}
      <p style="font-size:13px;color:#3f3b33;margin-top:14px">Le paiement est bien passé : vous pouvez raccrocher tranquille. ${row.essai ? "La commission est due au premier encaissement, à la fin de l'essai." : "La commission sera versée le 9 du mois suivant."}</p></div>`);
    sent.push("closer");
  }
  await sendMail(EQUIPE, `[Deal] ${nom} · ${plan}${closer ? " · " + closer.full_name : ""}`, `<div style="font-family:Inter,Arial,sans-serif;color:#14181d;max-width:520px">${lignes}<p style="font-size:13px;color:#6f6a5c;margin-top:12px">Closer : ${esc(closer?.full_name || "non identifié (lien sans étiquette)")}</p></div>`);
  sent.push("equipe");
  // Client (décision du 11 nov. 2026) : confirmation immédiate, puis bienvenue 14 jours déclenchée tout de suite (GitHub, via Supabase)
  try {
    const conf = confirmationClient({ prenom: (session.customer_details?.name || "").split(" ")[0], plan: row.plan, zone: row._zone,
      zoneSaisie: row.zone_saisie, metier: row.secteur, essai: row.essai });
    await sendMail(row.email, conf.subject, conf.html, "LeBonProspect <alerte@lebonprospect.fr>", "lawrenza@lebonprospect.fr");
    sent.push("client");
    if (conf.automatique) {
      const { data: abo } = await admin.from("subscribers").select("id").eq("email", row.email).maybeSingle();
      if (abo?.id) {
        const { error } = await admin.rpc("lbp_dispatch", { p_workflow: "bienvenue.yml", p_inputs: { abonne: String(abo.id) } });
        if (!error) sent.push("bienvenue");
        else console.error("[deal] bienvenue", error.message);
      }
    }
  } catch (e) { console.error("[deal] client", e.message); }
  // Groupe WhatsApp (optionnel) : un seul appel HTTP vers le pont configuré, sans bloquer le webhook s'il échoue
  const hook = process.env.WHATSAPP_DEAL_WEBHOOK;
  if (hook) {
    try {
      await fetch(hook, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.WHATSAPP_DEAL_TOKEN || ""}` },
        body: JSON.stringify({ text: `Deal confirmé : ${nom} · ${plan} · ${row.essai ? "essai 7 jours" : montant || "payé"}${closer ? " · merci " + closer.full_name.split(" ")[0] : ""}` }), signal: AbortSignal.timeout(5000) });
      sent.push("whatsapp");
    } catch (e) { console.error("[deal] whatsapp", e.message); }
  }
  return { notif: sent, closer: closer?.full_name || null };
}

// Inscrit (ou met à jour) l'abonné à partir d'une Checkout Session terminée.
// Fonctionne pour un paiement direct comme pour un essai gratuit : dans les deux cas
// l'abonné reçoit sa confirmation immédiatement, puis l'édition de bienvenue (14 derniers jours) quelques minutes plus tard.
async function upsertFromSession(session) {
  const admin = supabaseAdmin();
  const email = (session.customer_details?.email || session.customer_email || "").toLowerCase();
  if (!email) return { skipped: "no email" };
  const plan = session.metadata?.plan || null;
  const fields = Object.fromEntries((session.custom_fields || []).map((f) => [f.key, f.text?.value || null]));
  const zoneRaw = fields.zone || null;
  // Zone choisie sur la carte de la home (lien Stripe ?client_reference_id=dep-69), utilisée seulement si le client n'a rien saisi
  const depCarte = /^dep-([0-9]{2}|2A|2B)$/i.exec(session.client_reference_id || "")?.[1]?.toUpperCase() || null;
  const zone = zoneRaw ? resolveZone(zoneRaw, plan) : depCarte ? resolveZone(depCarte, "departemental") : null;
  const essai = session.metadata?.essai === "7j";
  const sub = session.subscription ? await stripe.subscriptions.retrieve(session.subscription) : null;

  const row = {
    email,
    nom: session.customer_details?.name || null,
    plan,
    verticales: ["chr"],
    regions: zone?.type === "region" ? [zone.nom] : plan === "national" ? null : null,
    departements: zone?.type === "departement" ? [zone.nom] : null,
    stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id || null,
    stripe_subscription_id: sub?.id || null,
    stripe_status: sub?.status || null,
    statut: "actif",
    essai,
    essai_fin: sub?.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    source: session.metadata?.source || "site",
    telephone: session.customer_details?.phone || null,
    secteur: fields.secteur || null,
    zone_saisie: zoneRaw || (depCarte ? `carte de la home : ${depCarte}` : null),
  };
  const { error } = await admin.from("subscribers").upsert(row, { onConflict: "email" });
  row._zone = zone;
  if (error) throw new Error(error.message);
  let notif = null;
  const confirme = essai || session.payment_status === "paid" || session.payment_status === "no_payment_required";
  if (confirme) { try { notif = await notifyDeal(admin, session, row); } catch (e) { console.error("[deal] notif", e.message); } }
  else notif = { notif: "paiement_en_attente" };
  return { email, plan, zone, essai, zone_reconnue: !!zone, notif };
}

export async function POST(req) {
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return new Response(`Signature invalide: ${e.message}`, { status: 400 });
  }
  const admin = supabaseAdmin();
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const r = await upsertFromSession(event.data.object);
        console.log("[stripe] abonné", r);
        break;
      }
      case "invoice.paid": {
        // premier vrai encaissement (fin d'essai ou paiement direct) : fait générateur commission
        const inv = event.data.object;
        if (inv.subscription && inv.amount_paid > 0) {
          await admin.from("subscribers")
            .update({ premier_paiement_at: new Date(inv.status_transitions?.paid_at * 1000 || Date.now()).toISOString(), stripe_status: "active", statut: "actif" })
            .eq("stripe_subscription_id", inv.subscription).is("premier_paiement_at", null);
        }
        break;
      }
      case "customer.subscription.updated": {
        const s = event.data.object;
        await admin.from("subscribers").update({ stripe_status: s.status, statut: ["active", "trialing"].includes(s.status) ? "actif" : "pause" })
          .eq("stripe_subscription_id", s.id);
        break;
      }
      case "customer.subscription.deleted": {
        const s = event.data.object;
        await admin.from("subscribers").update({ stripe_status: "canceled", statut: "resilie", resilie_at: new Date().toISOString() })
          .eq("stripe_subscription_id", s.id);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("[stripe webhook]", event.type, e.message);
    return new Response("Erreur traitement", { status: 500 });
  }
  return Response.json({ received: true });
}
