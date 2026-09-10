"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";

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
const REGIONS = ["Île-de-France", "Auvergne-Rhône-Alpes", "Provence-Alpes-Côte d'Azur"];

export default function AppPage() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = pas connecté
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("accueil");
  const [rows, setRows] = useState([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [refilling, setRefilling] = useState(false);
  const [refillMsg, setRefillMsg] = useState("");
  const [filterStatut, setFilterStatut] = useState("tous");
  const [filterCloser, setFilterCloser] = useState("tous"); // pour l'admin

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const authedFetch = useCallback(
    async (url, opts = {}) => {
      const token = session?.access_token;
      return fetch(url, {
        ...opts,
        headers: { ...(opts.headers || {}), Authorization: `Bearer ${token}` },
      });
    },
    [session]
  );

  useEffect(() => {
    if (session === null) window.location.href = "/closers/login";
  }, [session]);

  useEffect(() => {
    if (!session) return;
    authedFetch("/api/me").then((r) => r.json()).then(setProfile);
  }, [session, authedFetch]);

  const loadRows = useCallback(() => {
    if (!session) return;
    setLoadingRows(true);
    authedFetch("/api/prospects")
      .then((r) => r.json())
      .then((d) => { setRows(Array.isArray(d) ? d : []); setLoadingRows(false); });
  }, [session, authedFetch]);

  useEffect(() => { if (tab === "prospects") loadRows(); }, [tab, loadRows]);

  const patch = async (id, fields) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...fields } : r)));
    await authedFetch("/api/prospects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...fields }),
    });
  };

  const doRefill = async (region) => {
    setRefilling(true);
    setRefillMsg("");
    const res = await authedFetch("/api/refill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ region: region || undefined }),
    });
    const data = await res.json();
    setRefilling(false);
    if (data.n > 0) {
      setRefillMsg(`✓ ${data.n} nouveaux prospects ajoutés à votre liste.`);
      loadRows();
    } else {
      setRefillMsg(data.message || "Rien de nouveau pour le moment.");
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/closers/login";
  };

  if (session === undefined || (session && !profile)) {
    return <div className="app-loading">Chargement…</div>;
  }
  if (session === null) return null;

  const filteredRows = rows.filter((r) => {
    if (filterStatut !== "tous" && r.statut !== filterStatut) return false;
    if (profile?.role === "admin" && filterCloser !== "tous" && r.closer_id !== filterCloser) return false;
    return true;
  });

  const closerIds = Array.from(new Set(rows.map((r) => r.closer_id))).filter(Boolean);

  const stats = {
    total: rows.length,
    signe: rows.filter((r) => r.statut === "signe").length,
    chaud: rows.filter((r) => r.statut === "chaud").length,
    aTraiter: rows.filter((r) => r.statut === "a_contacter").length,
  };

  return (
    <main className="app">
      <aside className="app-side">
        <div className="app-logo">
          <span className="mark">
            <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
              <path d="M2 13 L7 5 L11 10 L16 3" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="16" cy="3" r="2.2" fill="#d64a2e" />
            </svg>
          </span>
          LeBonProspect
        </div>
        <nav className="app-nav">
          <button className={tab === "accueil" ? "active" : ""} onClick={() => setTab("accueil")}>Accueil</button>
          <button className={tab === "prospects" ? "active" : ""} onClick={() => setTab("prospects")}>Mes prospects</button>
          <button className={tab === "documents" ? "active" : ""} onClick={() => setTab("documents")}>Documents</button>
          <button className={tab === "script" ? "active" : ""} onClick={() => setTab("script")}>Script d&apos;appel</button>
        </nav>
        <div className="app-side-foot">
          <div className="app-who">
            <b>{profile?.full_name}</b>
            <span>{profile?.role === "admin" ? "Admin" : "Closer"}</span>
          </div>
          <button className="app-logout" onClick={logout}>Se déconnecter</button>
        </div>
      </aside>

      <section className="app-main">
        {tab === "accueil" && (
          <div className="app-panel">
            <h1 className="app-h1">Bonjour {profile?.full_name?.split(" ")[0]} 👋</h1>
            <p className="app-lead">Voici où vous en êtes.</p>

            <div className="dash-stats" style={{ marginTop: 20 }}>
              <div className="dash-stat"><div className="n">{stats.total}</div><div className="l">prospects assignés</div></div>
              <div className="dash-stat"><div className="n">{stats.aTraiter}</div><div className="l">à contacter</div></div>
              <div className="dash-stat hot"><div className="n">{stats.chaud}</div><div className="l">chauds</div></div>
              <div className="dash-stat ok"><div className="n">{stats.signe}</div><div className="l">signés</div></div>
            </div>

            {profile?.role !== "admin" && (
              <div className="cl-card dark" style={{ marginTop: 24 }}>
                <h3 style={{ color: "#fff", marginBottom: 8 }}>Recevoir de nouveaux leads</h3>
                <p style={{ marginBottom: 14 }}>
                  Piochez de nouveaux prospects CHR dans le vivier, non assignés à un autre closer. Par lot de 15.
                </p>
                <div className="app-refill-row">
                  <button className="btn" onClick={() => doRefill(null)} disabled={refilling}>
                    {refilling ? "..." : "+ 15 nouveaux leads (toutes zones)"}
                  </button>
                  {REGIONS.map((r) => (
                    <button key={r} className="btn inv" onClick={() => doRefill(r)} disabled={refilling}>
                      {refilling ? "..." : `+ ${r}`}
                    </button>
                  ))}
                </div>
                {refillMsg && <p style={{ marginTop: 12, color: "#a9d2d3", fontWeight: 700 }}>{refillMsg}</p>}
              </div>
            )}

            <div className="cl-card teal" style={{ marginTop: 20 }}>
              <p>
                Besoin du script d&apos;appel, de la plaquette ou de la grille de commission ? Tout est dans l&apos;onglet{" "}
                <b>Documents</b>.
              </p>
            </div>
          </div>
        )}

        {tab === "prospects" && (
          <div className="app-panel">
            <h1 className="app-h1">Mes prospects</h1>
            <div className="dash-filters" style={{ marginTop: 16 }}>
              <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}>
                <option value="tous">Tous les statuts</option>
                {STATUTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
              {profile?.role === "admin" && (
                <select value={filterCloser} onChange={(e) => setFilterCloser(e.target.value)}>
                  <option value="tous">Tous les closers</option>
                  {closerIds.map((id) => <option key={id} value={id}>{id.slice(0, 8)}</option>)}
                </select>
              )}
              <button className="btn inv" onClick={loadRows} style={{ padding: "9px 16px", fontSize: 13 }}>↻ Rafraîchir</button>
            </div>

            {loadingRows ? (
              <p style={{ padding: "30px 0", color: "#6f6a5c" }}>Chargement…</p>
            ) : (
              <div className="dash-table-wrap" style={{ marginTop: 16 }}>
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Société</th><th>Zone</th><th>Tél.</th><th>Lien</th>
                      <th>Statut</th><th>Prochaine action</th><th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((r) => (
                      <tr key={r.id}>
                        <td><b>{r.societe}</b><div className="dash-sub">{r.categorie}</div></td>
                        <td className="dash-sub">{r.region}<br />{r.ville}</td>
                        <td>{r.telephone && <a href={`tel:${r.telephone.replace(/\s/g, "")}`} className="mono">{r.telephone}</a>}</td>
                        <td>{r.lien_teaser && <a href={r.lien_teaser} target="_blank" rel="noreferrer" className="dash-link">voir →</a>}</td>
                        <td>
                          <select
                            value={r.statut || "a_contacter"}
                            onChange={(e) => patch(r.id, { statut: e.target.value })}
                            style={{ color: STATUT_COLOR[r.statut] || "#14181d", fontWeight: 700 }}
                          >
                            {STATUTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
                          </select>
                        </td>
                        <td>
                          <input className="dash-input" defaultValue={r.prochaine_action || ""} placeholder="ex: rappel jeudi"
                            onBlur={(e) => e.target.value !== r.prochaine_action && patch(r.id, { prochaine_action: e.target.value })} />
                        </td>
                        <td>
                          <input className="dash-input wide" defaultValue={r.notes || ""} placeholder="objections…"
                            onBlur={(e) => e.target.value !== r.notes && patch(r.id, { notes: e.target.value })} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredRows.length === 0 && (
                  <p style={{ padding: "30px 0", textAlign: "center", color: "#6f6a5c" }}>
                    Aucun prospect pour le moment. Allez sur Accueil pour en récupérer.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "documents" && (
          <div className="app-panel">
            <h1 className="app-h1">Documents</h1>
            <p className="app-lead">Tout ce dont vous avez besoin, toujours à jour.</p>
            <div className="app-docs">
              <a className="app-doc" href="/closers" target="_blank" rel="noreferrer">
                <b>Kit de démarrage complet</b>
                <span>Produit, rémunération, do&apos;s &amp; don&apos;ts, processus</span>
              </a>
              <a className="app-doc" href="#" onClick={(e) => { e.preventDefault(); setTab("script"); }}>
                <b>Script d&apos;appel</b>
                <span>Accroche, pitch, objections, closing</span>
              </a>
            </div>
          </div>
        )}

        {tab === "script" && (
          <div className="app-panel">
            <h1 className="app-h1">Script d&apos;appel</h1>
            <div className="cl-card" style={{ marginTop: 16 }}>
              <b style={{ display: "block", marginBottom: 8, color: "#31777A" }}>Accroche (10 secondes)</b>
              <p>
                « Bonjour [Prénom], Lawrenza de LeBonProspect. [Le Bousti], un resto à [Marseille], vient de changer
                de propriétaire, publié jeudi au Journal officiel. Le repreneur rééquipe en ce moment. C&apos;est
                exactement le genre de client que vous cherchez, non ? »
              </p>
            </div>
            <div className="cl-card teal" style={{ marginTop: 12 }}>
              <b style={{ display: "block", marginBottom: 8 }}>Le moment décisif</b>
              <p>
                « Je vous envoie votre page pendant qu&apos;on parle... vous y êtes ? » Puis 10-15 secondes de
                silence pendant qu&apos;il scrolle.
              </p>
            </div>
            <div className="cl-card" style={{ marginTop: 12 }}>
              <b style={{ display: "block", marginBottom: 8, color: "#31777A" }}>Objections fréquentes</b>
              <ul className="cl-list">
                <li>« C&apos;est public, je peux le faire moi-même » → « Comptez 1h/jour pour trier. Nous, 8h du matin, 5€/jour. »</li>
                <li>« Envoyez-moi une doc » → « La doc, c&apos;est la page sous vos yeux. »</li>
                <li>« Trop cher » → « 3,50 à 5,50€ le prospect nominatif, vous payez combien ailleurs ? »</li>
              </ul>
            </div>
            <div className="cl-card dark" style={{ marginTop: 12 }}>
              <b style={{ display: "block", marginBottom: 8, color: "#fff" }}>Le close</b>
              <p>« Région à 299 ou département à 149, vous préférez lequel ? » Puis restez en ligne pendant le paiement.</p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
