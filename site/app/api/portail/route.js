import Stripe from "stripe";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Ouvre le portail client Stripe (factures, carte, résiliation) à partir de l'email d'abonné.
// Réponse volontairement identique que l'email existe ou non (pas d'énumération d'abonnés).
export async function POST(req) {
  const { email } = await req.json().catch(() => ({}));
  const e = (email || "").trim().toLowerCase();
  if (!e || !e.includes("@")) return Response.json({ error: "Email invalide." }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: sub } = await admin.from("subscribers").select("stripe_customer_id").eq("email", e).maybeSingle();
  let customerId = sub?.stripe_customer_id || null;
  if (!customerId) {
    // abonné créé avant le webhook : on retrouve le client Stripe par email
    const found = await stripe.customers.list({ email: e, limit: 1 });
    customerId = found.data[0]?.id || null;
    if (customerId && sub) await admin.from("subscribers").update({ stripe_customer_id: customerId }).eq("email", e);
  }
  if (!customerId) return Response.json({ ok: true, found: false });

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: "https://www.lebonprospect.fr/mon-compte?retour=1",
  });
  return Response.json({ ok: true, found: true, url: session.url });
}
