"use client";

import { useEffect, useMemo, useState } from "react";

const KIND = { bienvenue: "Bienvenue", quotidien: "Quotidien", filet: "Filet (jour creux)", hebdo: "Récap hebdo" };
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—");
const fmtHeure = (iso) => (iso ? new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

export default function SuiviTest({ authedFetch }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(null);       // id du log ouvert
  const [html, setHtml] = useState("");
  const [filtre, setFiltre] = useState("tous");

  const load = async () => {
    try {
      const r = await authedFetch("/api/suivi-test");
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erreur");
      setData(j); setErr("");
    } catch (e) { setErr(e.message); }
  };
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, []);

  const voir = async (id) => {
    if (open === id) { setOpen(null); return; }
    setOpen(id); setHtml("");
    const r = await authedFetch("/api/suivi-test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const j = await r.json(); setHtml(j.html || "");
  };

  const parSub = useMemo(() => {
    if (!data) return {};
    const out = {};
    for (const s of data.subs) {
      const L = data.logs.filter((l) => l.subscriber_id === s.id);
      const snaps = L.flatMap((l) => (Array.isArray(l.lead_snapshot) ? l.lead_snapshot : []));
      const uniq = new Map(); snaps.forEach((x) => { if (x.id != null) uniq.set(x.id, x); });
      const leads = [...uniq.values()];
      const quotidiens = L.filter((l) => l.type === "quotidien" || l.type === "filet");
      out[s.id] = {
        logs: L, nbEnvois: L.length,
        leadsUniques: leads.length,
        tel: leads.filter((x) => x.tel).length,
        neufs: leads.filter((x) => x.neuf).length,
        jours: new Set(quotidiens.map((l) => l.edition)).size,
        filets: L.filter((l) => l.type === "filet").length,
        parDept: leads.reduce((a, x) => ({ ...a, [x.dept]: (a[x.dept] || 0) + 1 }), {}),
      };
    }
    return out;
  }, [data]);

  if (err) return <div className="app-card"><b>Suivi de l&apos;essai</b><p style={{ color: "#b23a3a" }}>{err}</p></div>;
  if (!data) return <div className="app-card">Chargement du suivi…</div>;

  const tot = Object.values(parSub).reduce((a, x) => ({ envois: a.envois + x.nbEnvois, leads: a.leads + x.leadsUniques, tel: a.tel + x.tel, neufs: a.neufs + x.neufs }), { envois: 0, leads: 0, tel: 0, neufs: 0 });
  const toutLogs = data.logs.filter((l) => filtre === "tous" || l.subscriber_id === Number(filtre) || l.type === filtre).slice(0, 200);
  const subById = Object.fromEntries(data.subs.map((s) => [s.id, s]));
  const maxJ = Math.max(1, ...data.jours.map((j) => j.n));

  return (
    <div className="suivi">
      <h1 className="app-h1">Suivi de l&apos;essai · Verisure</h1>
      <p style={{ color: "#6f6a5c", fontSize: 14, margin: "4px 0 16px" }}>
        Essai de 3 mois. Chaque email envoyé aux deux directeurs régionaux apparaît ici, avec exactement ce qu&apos;ils ont reçu. Mise à jour automatique toutes les minutes.
      </p>

      <div className="suivi-kpis">
        <div className="app-card"><div className="kpi-n">{tot.envois}</div><div className="kpi-l">emails envoyés</div></div>
        <div className="app-card"><div className="kpi-n">{tot.leads}</div><div className="kpi-l">reprises transmises (sans doublon)</div></div>
        <div className="app-card"><div className="kpi-n">{tot.leads ? Math.round((100 * tot.tel) / tot.leads) : 0} %</div><div className="kpi-l">avec téléphone</div></div>
        <div className="app-card"><div className="kpi-n">{tot.neufs}</div><div className="kpi-l">repreneurs « budgets ouverts »</div></div>
      </div>

      <div className="suivi-grid">
        {data.subs.map((s) => {
          const p = parSub[s.id];
          const jPasses = s.test_debut ? Math.max(0, Math.floor((Date.now() - new Date(s.test_debut).getTime()) / 86400000)) : 0;
          const jTotal = s.test_debut && s.test_fin ? Math.round((new Date(s.test_fin) - new Date(s.test_debut)) / 86400000) : 92;
          return (
            <div className="app-card" key={s.id}>
              <b style={{ fontSize: 16 }}>{s.nom}</b>
              <div style={{ fontSize: 12.5, color: "#6f6a5c", margin: "2px 0 10px" }}>{s.email}<br />{s.zone_label}</div>
              <div style={{ fontSize: 13 }}>
                <div className="suivi-row"><span>Jour d&apos;essai</span><b>{Math.min(jPasses + 1, jTotal)} / {jTotal}</b></div>
                <div className="suivi-bar"><div style={{ width: `${Math.min(100, (100 * jPasses) / jTotal)}%` }} /></div>
                <div className="suivi-row"><span>Emails envoyés</span><b>{p.nbEnvois}</b></div>
                <div className="suivi-row"><span>Reprises transmises</span><b>{p.leadsUniques}</b></div>
                <div className="suivi-row"><span>Avec téléphone</span><b>{p.tel}{p.leadsUniques ? ` (${Math.round((100 * p.tel) / p.leadsUniques)} %)` : ""}</b></div>
                <div className="suivi-row"><span>Budgets ouverts</span><b>{p.neufs}</b></div>
                <div className="suivi-row"><span>Jours « creux » (filet envoyé)</span><b>{p.filets}</b></div>
                <div className="suivi-row"><span>Dernier envoi</span><b>{fmtHeure(p.logs[0]?.created_at)}</b></div>
              </div>
              {Object.keys(p.parDept).length > 0 && (
                <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {Object.entries(p.parDept).sort((a, b) => b[1] - a[1]).map(([d, n]) => <span key={d} className="suivi-chip">{d} <b>{n}</b></span>)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="app-card" style={{ marginTop: 14 }}>
        <b>Ce qui est publié chaque jour dans leurs départements (30 jours)</b>
        <p style={{ fontSize: 12.5, color: "#6f6a5c", margin: "4px 0 10px" }}>Tous avis confondus, avant le tri « vrai commerce ». Les jours à zéro sont ceux où le « filet » prend le relais.</p>
        <div className="suivi-jours">
          {data.jours.map((j) => (
            <div key={j.d} title={`${fmtDate(j.d)} : ${j.n}`} style={{ height: 6 + (48 * j.n) / maxJ }} className="suivi-jour"><span>{j.n}</span></div>
          ))}
          {data.jours.length === 0 && <span style={{ color: "#6f6a5c", fontSize: 13 }}>Aucune donnée.</span>}
        </div>
      </div>

      <div className="app-card" style={{ marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <b>Journal des envois</b>
          <select value={filtre} onChange={(e) => setFiltre(e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e6e0d0" }}>
            <option value="tous">Tous</option>
            {data.subs.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
            {Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {toutLogs.length === 0 && <p style={{ color: "#6f6a5c", fontSize: 13.5, marginTop: 10 }}>Aucun email encore envoyé. Le premier part demain matin à 8h.</p>}
        {toutLogs.map((l) => (
          <div key={l.id} className="suivi-log">
            <div className="suivi-log-head" onClick={() => voir(l.id)}>
              <span className={`suivi-kind k-${l.type}`}>{KIND[l.type] || l.type}</span>
              <span style={{ flex: 1, fontSize: 13.5 }}><b>{subById[l.subscriber_id]?.nom}</b> · {l.sujet}</span>
              <span style={{ fontSize: 12, color: "#6f6a5c", whiteSpace: "nowrap" }}>{l.nb_leads} reprise{l.nb_leads > 1 ? "s" : ""} · {fmtHeure(l.created_at)}</span>
            </div>
            {open === l.id && (
              <div style={{ marginTop: 10 }}>
                {html ? <iframe title="apercu" srcDoc={html} style={{ width: "100%", height: 560, border: "1px solid #e6e0d0", borderRadius: 10, background: "#fff" }} /> : <p style={{ fontSize: 13, color: "#6f6a5c" }}>Chargement de l&apos;aperçu…</p>}
                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: "pointer", fontSize: 13 }}>Les {l.nb_leads} reprises de cet email</summary>
                  <table style={{ width: "100%", fontSize: 12.5, marginTop: 6, borderCollapse: "collapse" }}>
                    <tbody>
                      {(l.lead_snapshot || []).map((x, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #f0ebde" }}>
                          <td style={{ padding: "4px 6px" }}><b>{x.nom}</b></td><td>{x.ville} ({x.dept})</td><td>{fmtDate(x.date)}</td>
                          <td>{x.tel ? "tél." : "pas de tél."}</td><td>{x.neuf ? "budgets ouverts" : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
