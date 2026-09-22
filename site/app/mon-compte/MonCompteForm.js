"use client";

import { useState } from "react";

export default function MonCompteForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | loading | notfound | error
  const submit = async (e) => {
    e.preventDefault();
    setState("loading");
    try {
      const r = await fetch("/api/portail", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const d = await r.json();
      if (d.url) { window.location.href = d.url; return; }
      setState(d.found === false ? "notfound" : "error");
    } catch { setState("error"); }
  };
  return (
    <div className="compte-card">
      <form onSubmit={submit} className="compte-form">
        <label htmlFor="email">Votre email d&apos;abonné</label>
        <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@entreprise.fr" autoComplete="email" />
        <button className="btn" type="submit" disabled={state === "loading"}>{state === "loading" ? "Ouverture..." : "Accéder à mon espace"}</button>
      </form>
      {state === "notfound" && (
        <p className="compte-msg">Aucun abonnement trouvé pour cette adresse. Vérifiez l&apos;email utilisé lors du paiement, ou écrivez-nous à <a href="mailto:contact@lebonprospect.fr">contact@lebonprospect.fr</a>.</p>
      )}
      {state === "error" && <p className="compte-msg">Une erreur est survenue. Réessayez dans un instant ou écrivez-nous à <a href="mailto:contact@lebonprospect.fr">contact@lebonprospect.fr</a>.</p>}
      <div className="compte-help">
        <b>Dans votre espace</b>
        <ul>
          <li>Télécharger vos factures</li>
          <li>Mettre à jour votre carte bancaire</li>
          <li>Résilier votre abonnement, en un clic, sans justification</li>
        </ul>
        <p>Pour changer l&apos;email qui reçoit le digest ou votre zone, répondez simplement à l&apos;un de vos digests : c&apos;est fait dans la journée.</p>
      </div>
    </div>
  );
}
