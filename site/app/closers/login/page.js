"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

// Connexion des closers (refonte visuelle nov. 2026). La logique d'authentification est INCHANGÉE :
// signInWithPassword, inscription via /api/auth/signup avec code d'invitation, redirection vers /closers/app.

const Logo = () => (
  <svg aria-hidden="true" width="28" height="28" viewBox="0 0 28 28"><rect width="28" height="28" rx="8" fill="#31777A" /><path d="M8 14.5l4 4 8-9" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const PERKS = [
  "Des prospects triés par secteur et zone, en un clic",
  "Scripts d'appel, plaquette et suivi intégrés",
  "Commission versée le 9 de chaque mois, par virement instantané",
];
const OEIL = "M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6S2.5 12 2.5 12z";
const OEIL_BARRE = "M3 3l18 18M10.6 6.1A10 10 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3.2 3.9M6.6 7.6A16.6 16.6 0 0 0 2.5 12S6 18 12 18a9.6 9.6 0 0 0 4-.9";

// Message d'erreur de connexion : jamais d'indice sur l'existence du compte ni sur le champ fautif.
function messageConnexion(error) {
  const m = String(error?.message || "").toLowerCase();
  if (error?.status === 429 || m.includes("rate limit") || m.includes("too many")) return "Trop de tentatives. Patientez quelques minutes, puis réessayez.";
  if (m.includes("fetch") || m.includes("network")) return "Connexion impossible pour le moment. Vérifiez votre réseau et réessayez.";
  return "Email ou mot de passe incorrect. Vérifiez vos identifiants et réessayez.";
}

export default function LoginPage() {
  const [mode, setMode] = useState("login"); // login | signup
  const [form, setForm] = useState({ email: "", password: "", full_name: "", invite_code: "" });
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [voir, setVoir] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const doLogin = async (e) => {
    e.preventDefault();
    setErr(""); setInfo(""); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email.trim().toLowerCase(),
      password: form.password,
    });
    setLoading(false);
    if (error) { setErr(messageConnexion(error)); return; }
    window.location.href = "/closers/app";
  };

  const doSignup = async (e) => {
    e.preventDefault();
    setErr(""); setInfo(""); setLoading(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setErr(data.error || "Erreur lors de l'inscription."); return; }
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email.trim().toLowerCase(),
      password: form.password,
    });
    if (error) { setMode("login"); setInfo("Compte créé, connectez-vous."); return; }
    window.location.href = "/closers/app";
  };

  const changer = (m) => (e) => { e.preventDefault(); setMode(m); setErr(""); setInfo(""); };
  const login = mode === "login";

  return (
    <main className="lg">
      <section className="lg-brand h-dots">
        <a href="/" className="h-logo"><Logo />LeBonProspect</a>
        <div className="lg-brand-mid">
          <div className="h-pill"><span className="h-dot" aria-hidden="true" />Espace équipe commerciale</div>
          <h1 className="lg-h1">L&apos;espace des <span className="soft">closers</span></h1>
          <p className="lg-lead">Chaque matin, des commerces changent de propriétaire en France. Votre mission : les fournisseurs qui les équipent avant leurs concurrents.</p>
          <ul className="lg-perks">
            {PERKS.map((p) => (
              <li key={p}>
                <span aria-hidden="true" className="lg-check"><svg width="14" height="14" viewBox="0 0 12 12"><path d="M2.5 6.2l2.4 2.4 4.6-5" fill="none" stroke="#7CC3C6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="lg-comm">
          <span aria-hidden="true" className="lg-comm-ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7CC3C6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10h18M5 10v9h14v-9M12 4l9 6H3z" /></svg></span>
          <div>
            <div className="h-mono-l">Commissions</div>
            <div className="lg-comm-t">Versées le <strong>9 de chaque mois</strong>, par virement instantané</div>
          </div>
        </div>
      </section>

      <section className="lg-form-side">
        <div className="lg-box">
          <h2 className="lg-h2">{login ? "Connexion" : "Créer mon compte"}</h2>
          <p className="lg-sub">{login ? "Espace équipe commerciale, accès personnel." : "Un code d'invitation vous a été communiqué par Lawrenza ou Baptiste."}</p>

          <form onSubmit={login ? doLogin : doSignup} className="lg-form" noValidate={false}>
            {err && (
              <div role="alert" className="lg-alert">
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#991B1B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.01" /></svg>
                <span>{err}</span>
              </div>
            )}
            {info && <div role="status" className="lg-info">{info}</div>}

            {!login && (
              <div>
                <label htmlFor="lg-name" className="lg-label">Nom complet</label>
                <input id="lg-name" name="name" autoComplete="name" placeholder="Prénom Nom" value={form.full_name} onChange={set("full_name")} required className={`lg-input${err ? " bad" : ""}`} />
              </div>
            )}
            <div>
              <label htmlFor="lg-email" className="lg-label">Email</label>
              <input id="lg-email" name="email" type="email" autoComplete="email" placeholder="prenom@exemple.fr" value={form.email} onChange={set("email")} required className={`lg-input${err ? " bad" : ""}`} aria-invalid={!!err} />
            </div>
            <div>
              <div className="lg-label-row">
                <label htmlFor="lg-pass" className="lg-label">Mot de passe</label>
                {login && <a className="lg-link small" href="mailto:contact@lebonprospect.fr?subject=Mot%20de%20passe%20closer">Mot de passe oublié ?</a>}
              </div>
              <div className="lg-pass">
                <input id="lg-pass" name="password" type={voir ? "text" : "password"} autoComplete={login ? "current-password" : "new-password"}
                  placeholder={login ? "Votre mot de passe" : "8 caractères minimum"} value={form.password} onChange={set("password")} required minLength={8}
                  className={`lg-input${err ? " bad" : ""}`} aria-invalid={!!err} />
                <button type="button" className="lg-eye" onClick={() => setVoir(!voir)} aria-label={voir ? "Masquer le mot de passe" : "Afficher le mot de passe"} aria-pressed={voir}>
                  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#556079" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={voir ? OEIL_BARRE : OEIL} /><circle cx="12" cy="12" r="3" /></svg>
                </button>
              </div>
            </div>
            {!login && (
              <div>
                <label htmlFor="lg-code" className="lg-label">Code d&apos;invitation</label>
                <input id="lg-code" name="invite_code" autoComplete="off" placeholder="lbp-closer-2026" value={form.invite_code} onChange={set("invite_code")} required className="lg-input" />
              </div>
            )}
            <button type="submit" className="lg-submit" disabled={loading}>
              {loading ? "Un instant…" : login ? "Se connecter" : "Créer mon compte"}
              {!loading && <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18"><path d="M3 9h11M10 4.5L14.5 9 10 13.5" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </button>
          </form>

          <div className="lg-switch">
            {login ? (
              <>Pas encore de compte ? <a href="#" className="lg-link" onClick={changer("signup")}>Créer un compte</a></>
            ) : (
              <>Déjà un compte ? <a href="#" className="lg-link" onClick={changer("login")}>Se connecter</a></>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
