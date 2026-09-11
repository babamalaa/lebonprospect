"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const [mode, setMode] = useState("login"); // login | signup
  const [form, setForm] = useState({ email: "", password: "", full_name: "", invite_code: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const doLogin = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email.trim().toLowerCase(),
      password: form.password,
    });
    setLoading(false);
    if (error) { setErr("Email ou mot de passe incorrect."); return; }
    window.location.href = "/closers/app";
  };

  const doSignup = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
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
    if (error) { setMode("login"); setErr("Compte créé, connectez-vous."); return; }
    window.location.href = "/closers/app";
  };

  return (
    <main className="auth-page">
      {/* Panneau de contexte, visible desktop uniquement */}
      <div className="auth-context">
        <div className="auth-context-inner">
          <div className="logo" style={{ marginBottom: 34 }}>
            <span className="mark">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 13 L7 5 L11 10 L16 3" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="16" cy="3" r="2.2" fill="#d64a2e" />
              </svg>
            </span>
            LeBonProspect
          </div>
          <h1 className="auth-context-h1">
            L&apos;espace des <span className="hl">closers</span>
          </h1>
          <p className="auth-context-p">
            Chaque matin, des commerces changent de propriétaire en France. Votre mission : les
            fournisseurs qui les équipent avant leurs concurrents.
          </p>
          <div className="auth-feature-list">
            <div className="auth-feature">
              <span className="auth-feature-dot">✓</span>
              Des prospects triés par secteur et zone, en un clic
            </div>
            <div className="auth-feature">
              <span className="auth-feature-dot">✓</span>
              Scripts d&apos;appel, plaquette et suivi intégrés
            </div>
            <div className="auth-feature">
              <span className="auth-feature-dot">✓</span>
              Commission versée en instantané, dès l&apos;encaissement
            </div>
          </div>
        </div>
      </div>

      {/* Formulaire */}
      <div className="auth-form-side">
        <div className="auth-box">
          <div className="logo auth-box-logo">
            <span className="mark">
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                <path d="M2 13 L7 5 L11 10 L16 3" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="16" cy="3" r="2.2" fill="#d64a2e" />
              </svg>
            </span>
            LeBonProspect
          </div>

          <h2 className="auth-title">{mode === "login" ? "Connexion" : "Créer mon compte"}</h2>
          <p className="auth-sub">
            {mode === "login"
              ? "Espace équipe commerciale, accès personnel."
              : "Un code d'invitation vous a été communiqué par Lawrenza ou Baptiste."}
          </p>

          <form onSubmit={mode === "login" ? doLogin : doSignup} className="auth-form">
            {mode === "signup" && (
              <div className="auth-field">
                <label>Nom complet</label>
                <input placeholder="Prénom Nom" value={form.full_name} onChange={set("full_name")} required />
              </div>
            )}
            <div className="auth-field">
              <label>Email</label>
              <input type="email" placeholder="vous@exemple.fr" value={form.email} onChange={set("email")} required />
            </div>
            <div className="auth-field">
              <label>Mot de passe</label>
              <input
                type="password"
                placeholder="8 caractères minimum"
                value={form.password}
                onChange={set("password")}
                required
                minLength={8}
              />
            </div>
            {mode === "signup" && (
              <div className="auth-field">
                <label>Code d&apos;invitation</label>
                <input placeholder="lbp-closer-2026" value={form.invite_code} onChange={set("invite_code")} required />
              </div>
            )}
            <button type="submit" className="btn auth-submit" disabled={loading}>
              {loading ? "..." : mode === "login" ? "Se connecter" : "Créer mon compte"}
            </button>
          </form>

          {err && <p className="gate-err">{err}</p>}

          <p className="auth-switch">
            {mode === "login" ? (
              <>
                Pas encore de compte ?{" "}
                <a href="#" onClick={(e) => { e.preventDefault(); setMode("signup"); setErr(""); }}>
                  Créer un compte
                </a>
              </>
            ) : (
              <>
                Déjà un compte ?{" "}
                <a href="#" onClick={(e) => { e.preventDefault(); setMode("login"); setErr(""); }}>
                  Se connecter
                </a>
              </>
            )}
          </p>
        </div>
      </div>
    </main>
  );
}
