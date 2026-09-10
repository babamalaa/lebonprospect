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
    // auto-login après inscription
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email.trim().toLowerCase(),
      password: form.password,
    });
    if (error) { setMode("login"); setErr("Compte créé, connectez-vous."); return; }
    window.location.href = "/closers/app";
  };

  return (
    <main className="gate-wrap">
      <div className="gate-box" style={{ maxWidth: 380 }}>
        <div className="logo" style={{ justifyContent: "center", marginBottom: 14 }}>
          <span className="mark">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 13 L7 5 L11 10 L16 3" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="16" cy="3" r="2.2" fill="#d64a2e" />
            </svg>
          </span>
          LeBonProspect
        </div>
        <h1>{mode === "login" ? "Connexion" : "Créer mon compte"}</h1>
        <p>
          {mode === "login"
            ? "Espace équipe commerciale, accès personnel."
            : "Un code d'invitation vous a été communiqué par Lawrenza ou Baptiste."}
        </p>

        <form onSubmit={mode === "login" ? doLogin : doSignup}>
          {mode === "signup" && (
            <input placeholder="Prénom Nom" value={form.full_name} onChange={set("full_name")} required />
          )}
          <input type="email" placeholder="Email" value={form.email} onChange={set("email")} required />
          <input
            type="password"
            placeholder="Mot de passe"
            value={form.password}
            onChange={set("password")}
            required
            minLength={8}
          />
          {mode === "signup" && (
            <input
              placeholder="Code d'invitation"
              value={form.invite_code}
              onChange={set("invite_code")}
              required
            />
          )}
          <button type="submit" className="btn" disabled={loading}>
            {loading ? "..." : mode === "login" ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>

        {err && <p className="gate-err">{err}</p>}

        <p style={{ marginTop: 16, fontSize: 12 }}>
          {mode === "login" ? (
            <>
              Pas encore de compte ?{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); setMode("signup"); setErr(""); }} style={{ color: "#31777A", fontWeight: 700 }}>
                Créer un compte
              </a>
            </>
          ) : (
            <>
              Déjà un compte ?{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); setMode("login"); setErr(""); }} style={{ color: "#31777A", fontWeight: 700 }}>
                Se connecter
              </a>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
