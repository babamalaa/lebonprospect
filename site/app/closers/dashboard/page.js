"use client";

import { useEffect, useState, useMemo } from "react";

const PASSWORD = "lbp2026closers";
const STATUTS = [
  { v: "a_contacter", l: "À contacter" },
  { v: "repondeur", l: "Répondeur" },
  { v: "barrage", l: "Barrage" },
  { v: "a_rappeler", l: "À rappeler" },
  { v: "chaud", l: "Chaud" },
  { v: "signe", l: "Signé" },
  { v: "non", l: "Non" },
];
const STATUT_COLOR = {
  a_contacter: "#6f6a5c", repondeur: "#8a5a2e", barrage: "#8a5a2e",
  a_rappeler: "#2e6b8a", chaud: "#d64a2e", signe: "#1e7a4d", non: "#6f6a5c",
};

export default function DashboardPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState("");
  const [err, setErr] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCloser, setFilterCloser] = useState("tous");
  const [filterStatut, setFilterStatut] = useState("tous");

  const load = () => {
    setLoading(true);
    fetch("/api/prospects")
      .then((r) => r.json())
      .then((d) => {
        setRows(Array.isArray(d) ? d : []);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (unlocked) load();
  }, [unlocked]);

  const tryUnlock = (e) => {
    e.preventDefault();
    if (input.trim() === PASSWORD) { setUnlocked(true); setErr(false); }
    else setErr(true);
  };

  const patch = async (id, fields) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...fields } : r)));
    await fetch("/api/prospects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...fields }),
    });
  };

  const closers = useMemo(() => {
    const s = new Set(rows.map((r) => r.closer).filter(Boolean));
    return Array.from(s).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filterCloser !== "tous" && r.closer !== filterCloser) return false;
      if (filterStatut !== "tous" && r.statut !== filterStatut) return false;
      return true;
    });
  }, [rows, filterCloser, filterStatut]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const signe = filtered.filter((r) => r.statut === "signe").length;
    const chaud = filtered.filter((r) => r.statut === "chaud").length;
    const traite = filtered.filter((r) => r.statut !== "a_contacter").length;
    return { total, signe, chaud, traite };
  }, [filtered]);

  if (!unlocked) {
    return (
      <main className="gate-wrap">
        <div className="gate-box">
          <div className="logo" style={{ justifyContent: "center", marginBottom: 18 }}>
            <span className="mark">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 13 L7 5 L11 10 L16 3" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="16" cy="3" r="2.2" fill="#d64a2e" />
              </svg>
            </span>
            LeBonProspect
          </div>
          <h1>Tableau de suivi</h1>
          <p>Document confidentiel. Entrez le mot de passe qui vous a été communiqué.</p>
          <form onSubmit={tryUnlock}>
            <input type="password" value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="Mot de passe" autoFocus />
            <button type="submit" className="btn">Accéder</button>
          </form>
          {err && <p className="gate-err">Mot de passe incorrect.</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="dash">
      <div className="cl-band">
        <div className="wrap cl-band-in">
          <span className="tz-logo">
            <span className="mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <path d="M2 13 L7 5 L11 10 L16 3" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="16" cy="3" r="2.2" fill="#d64a2e" />
              </svg>
            </span>
            LeBonProspect
          </span>
          <span className="tz-for">
            tableau de suivi · <a href="/closers" style={{ color: "#a8b0b8" }}>← retour au kit</a>
          </span>
        </div>
      </div>

      <div className="wrap dash-top">
        <h1 className="dash-title">Suivi des calls</h1>
        <div className="dash-stats">
          <div className="dash-stat"><div className="n">{stats.total}</div><div className="l">prospects (filtre actif)</div></div>
          <div className="dash-stat"><div className="n">{stats.traite}</div><div className="l">déjà contactés</div></div>
          <div className="dash-stat hot"><div className="n">{stats.chaud}</div><div className="l">chauds</div></div>
          <div className="dash-stat ok"><div className="n">{stats.signe}</div><div className="l">signés</div></div>
        </div>

        <div className="dash-filters">
          <select value={filterCloser} onChange={(e) => setFilterCloser(e.target.value)}>
            <option value="tous">Tous les closers</option>
            {closers.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}>
            <option value="tous">Tous les statuts</option>
            {STATUTS.map((s) => (
              <option key={s.v} value={s.v}>{s.l}</option>
            ))}
          </select>
          <button className="btn inv" onClick={load} style={{ padding: "9px 16px", fontSize: 13 }}>
            ↻ Rafraîchir
          </button>
        </div>

        {loading ? (
          <p style={{ padding: "30px 0", color: "#6f6a5c" }}>Chargement…</p>
        ) : (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>#</th><th>Société</th><th>Zone</th><th>Tél.</th><th>Lien</th>
                  <th>Closer</th><th>Statut</th><th>Prochaine action</th><th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td className="mono">{r.priorite}</td>
                    <td>
                      <b>{r.societe}</b>
                      <div className="dash-sub">{r.categorie}</div>
                    </td>
                    <td className="dash-sub">{r.region}<br />{r.ville}</td>
                    <td>
                      {r.telephone && (
                        <a href={`tel:${r.telephone.replace(/\s/g, "")}`} className="mono">{r.telephone}</a>
                      )}
                    </td>
                    <td>
                      {r.lien_teaser && (
                        <a href={r.lien_teaser} target="_blank" rel="noreferrer" className="dash-link">
                          voir →
                        </a>
                      )}
                    </td>
                    <td>
                      <input
                        className="dash-input"
                        defaultValue={r.closer || ""}
                        onBlur={(e) => e.target.value !== r.closer && patch(r.id, { closer: e.target.value })}
                      />
                    </td>
                    <td>
                      <select
                        value={r.statut || "a_contacter"}
                        onChange={(e) => patch(r.id, { statut: e.target.value })}
                        style={{ color: STATUT_COLOR[r.statut] || "#14181d", fontWeight: 700 }}
                      >
                        {STATUTS.map((s) => (
                          <option key={s.v} value={s.v}>{s.l}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        className="dash-input"
                        defaultValue={r.prochaine_action || ""}
                        placeholder="ex: rappel jeudi 14h"
                        onBlur={(e) => e.target.value !== r.prochaine_action && patch(r.id, { prochaine_action: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="dash-input wide"
                        defaultValue={r.notes || ""}
                        placeholder="objections, verbatim…"
                        onBlur={(e) => e.target.value !== r.notes && patch(r.id, { notes: e.target.value })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p style={{ padding: "30px 0", textAlign: "center", color: "#6f6a5c" }}>
                Aucun prospect pour ce filtre.
              </p>
            )}
          </div>
        )}
      </div>

      <footer style={{ marginTop: 40 }}>
        <div className="wrap">
          <span>© 2026 LeBonProspect</span>
          <span>contact@lebonprospect.fr</span>
        </div>
      </footer>
    </main>
  );
}
