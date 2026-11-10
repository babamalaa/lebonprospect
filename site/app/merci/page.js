import Stripe from "stripe";
import Header from "../components/Header";
import Purchase from "./Purchase";
import { envoyerPurchaseCapi } from "../lib/metaCapi";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Merci",
  description: "Votre abonnement LeBonProspect est confirmé.",
  robots: { index: false, follow: false, nocache: true },
};

// Page de retour après paiement (liens Stripe : success URL = /merci?session_id={CHECKOUT_SESSION_ID}).
// Le montant affiché et envoyé à Meta vient de Stripe, jamais de l'URL : une URL /merci tapée à la main ne déclenche rien.
async function lireSession(id) {
  if (!id || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(id) || !process.env.STRIPE_SECRET_KEY) return null;
  try {
    const s = await new Stripe(process.env.STRIPE_SECRET_KEY).checkout.sessions.retrieve(id);
    if (s.status !== "complete") return null;
    return {
      id: s.id,
      email: s.customer_details?.email || null,
      prenom: (s.customer_details?.name || "").split(" ")[0],
      montant: (s.amount_total ?? 0) / 100,
      devise: (s.currency || "eur").toUpperCase(),
      essai: s.metadata?.essai === "7j",
      plan: s.metadata?.plan || null,
    };
  } catch {
    return null;
  }
}

export default async function Merci({ searchParams }) {
  const sp = await searchParams;
  const session = await lireSession(sp?.session_id);
  // Doublon navigateur / serveur : même event_id, Meta n'en compte qu'un
  if (session && !session.essai) await envoyerPurchaseCapi(session);
  return (
    <>
      <Header />
      <section className="hero wrap" style={{ paddingTop: 64, paddingBottom: 40 }}>
        <div className="stamp"><span className="dot" />{session?.essai ? "Essai activé" : "Abonnement confirmé"}</div>
        <h1 className="sm" style={{ fontSize: 44 }}>Merci{session?.prenom ? `, ${session.prenom}` : ""}</h1>
        <p className="sub">
          Un email de confirmation vient de partir{session?.email ? ` à ${session.email}` : ""}. Dans quelques minutes, vous recevez une première
          édition avec les reprises publiées ces 14 derniers jours dans votre zone. Ensuite, chaque matin, le jour de la publication, avant 8h.
        </p>
      </section>
      <section className="wrap" style={{ paddingBottom: 120, maxWidth: 720 }}>
        <p style={{ fontSize: 16, lineHeight: 1.6 }}>
          Rien reçu d&apos;ici une heure ? Regardez dans l&apos;onglet Promotions ou les spams, et ajoutez
          {" "}<b>alerte@lebonprospect.fr</b> à vos contacts. Une erreur sur la zone ou le métier : répondez simplement à l&apos;email de confirmation.
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.6, marginTop: 16 }}>
          Factures et résiliation : <a href="/mon-compte">lebonprospect.fr/mon-compte</a>
        </p>
      </section>
      {session && !session.essai && <Purchase eventId={`purchase_${session.id}`} valeur={session.montant} devise={session.devise} />}
    </>
  );
}
