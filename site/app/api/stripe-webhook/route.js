import Stripe from "stripe";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { resolveZone } from "../../lib/geo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Inscrit (ou met à jour) l'abonné à partir d'une Checkout Session terminée.
// Fonctionne pour un paiement direct comme pour un essai gratuit : dans les deux cas
// l'abonné reçoit son premier digest dès le lendemain 8h.
async function upsertFromSession(session) {
  const admin = supabaseAdmin();
  const email = (session.customer_details?.email || session.customer_email || "").toLowerCase();
  if (!email) return { skipped: "no email" };
  const plan = session.metadata?.plan || null;
  const fields = Object.fromEntries((session.custom_fields || []).map((f) => [f.key, f.text?.value || null]));
  const zoneRaw = fields.zone || null;
  const zone = zoneRaw ? resolveZone(zoneRaw, plan) : null;
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
    zone_saisie: zoneRaw,
  };
  const { error } = await admin.from("subscribers").upsert(row, { onConflict: "email" });
  if (error) throw new Error(error.message);
  return { email, plan, zone, essai, zone_reconnue: !!zone };
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
