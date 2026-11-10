import crypto from "crypto";

// API de conversions Meta (envoi serveur du Purchase). INACTIVE tant que META_PIXEL_ID et META_CAPI_TOKEN
// ne sont pas définis dans Vercel. L'email est haché (SHA-256), jamais envoyé en clair.
const sha = (v) => crypto.createHash("sha256").update(String(v).trim().toLowerCase()).digest("hex");

export async function envoyerPurchaseCapi(session) {
  const pixel = process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const jeton = process.env.META_CAPI_TOKEN;
  if (!pixel || !jeton || !session) return { envoye: false, raison: "non configuré" };
  const corps = {
    data: [{
      event_name: "Purchase",
      event_time: Math.floor(Date.now() / 1000),
      event_id: `purchase_${session.id}`,
      action_source: "website",
      event_source_url: "https://www.lebonprospect.fr/merci",
      user_data: session.email ? { em: [sha(session.email)] } : {},
      custom_data: { value: session.montant, currency: session.devise, content_name: session.plan || undefined },
    }],
    ...(process.env.META_TEST_EVENT_CODE ? { test_event_code: process.env.META_TEST_EVENT_CODE } : {}),
  };
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${pixel}/events?access_token=${encodeURIComponent(jeton)}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps), signal: AbortSignal.timeout(4000),
    });
    return { envoye: r.ok, statut: r.status };
  } catch (e) {
    console.error("[capi]", e.message);
    return { envoye: false, raison: e.message };
  }
}
