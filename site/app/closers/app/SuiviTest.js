"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const KIND = { bienvenue: "Bienvenue", quotidien: "Quotidien", filet: "Filet (jour creux)", hebdo: "Récap hebdo" };
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—");
const fmtHeure = (iso) => (iso ? new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

export default function SuiviTest({ authedFetch }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(null);       // id du log ouvert
  const [html, setHtml] = useState("");
  const [filtre, setFiltre] = useState("tous");

  const [maj, setMaj] = useState(null);          // heure de la dernière mise à jour réussie
  const [chargement, setChargement] = useState(false);
  const [expire, setExpire] = useState(false);       // session expirée : il faut se reconnecter

  // Le jeton de connexion est renouvelé toutes les heures : on lit TOUJOURS la version courante de authedFetch,
  // jamais celle capturée à l'ouverture de la page (sinon, passé une heure, chaque rafraîchissement échouait en 401).
  const fetchRef = useRef(authedFetch);
  useEffect(() => { fetchRef.current = authedFetch; }, [authedFetch]);

  const load = useCallback(async () => {
    setChargement(true);
    try {
      const r = await fetchRef.current("/api/suivi-test", { cache: "no-store" });
      if (r.status === 401) { setExpire(true); setErr(""); return; }
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erreur");
      setData(j); setErr(""); setExpire(false); setMaj(new Date());
    } catch (e) {
      // une erreur passagère (réseau, veille du téléphone) ne doit pas effacer les chiffres déjà affichés
      setErr((prev) => prev || e.message);
    } finally { setChargement(false); }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    // un onglet en arrière-plan ou un téléphone en veille suspend les minuteurs : on rafraîchit dès qu'on revient sur la page
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", load);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVisible); window.removeEventListener("focus", load); };
  }, [load]);

  // la session vient d'être renouvelée par Supabase : on recharge tout de suite avec le nouveau jeton
  useEffect(() => { load(); }, [authedFetch, load]);

  const voir = async (id) => {
    if (open === id) { setOpen(null); return; }
    setOpen(id); setHtml("");
    const r = await authedFetch("/api/suivi-test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const j = await r.json(); setHtml(j.html || "");
  };

  // Une personne peut avoir plusieurs adresses (pro + perso) : on regroupe par nom, les reprises sont comptées une seule fois.
  const personnes = useMemo(() => {
    if (!data) return [];
    const groupes = new Map();
    for (const s of data.subs) {
      const k = (s.nom || s.email).trim().toLowerCase();
      if (!groupes.has(k)) groupes.set(k, { cle: k, nom: s.nom || s.email, subs: [] });
      groupes.get(k).subs.push(s);
    }
    return [...groupes.values()].map((g) => {
      const ids = new Set(g.subs.map((s) => s.id));
      const L = data.logs.filter((l) => ids.has(l.subscriber_id));
      const uniq = new Map();
      L.flatMap((l) => (Array.isArray(l.lead_snapshot) ? l.lead_snapshot : [])).forEach((x) => { if (x.id != null) uniq.set(x.id, x); });
      const leads = [...uniq.values()];
      const adresses = g.subs.map((s) => ({ email: s.email, envois: L.filter((l) => l.subscriber_id === s.id).length, dernier: L.find((l) => l.subscriber_id === s.id)?.created_at }));
      const debut = g.subs.map((s) => s.test_debut).filter(Boolean).sort()[0];
      const fin = g.subs.map((s) => s.test_fin).filter(Boolean).sort().slice(-1)[0];
      return {
        ...g, logs: L, adresses, debut, fin, zone: g.subs[0].zone_label,
        nbEnvois: L.length, leadsUniques: leads.length,
        tel: leads.filter((x) => x.tel).length, neufs: leads.filter((x) => x.neuf).length,
        filets: L.filter((l) => l.type === "filet").length,
        parDept: leads.reduce((a, x) => ({ ...a, [x.dept]: (a[x.dept] || 0) + 1 }), {}),
      };
    });
  }, [data]);

  if (expire && !data) return (
    <div className="app-card"><b>Votre session a expiré.</b>
      <p style={{ fontSize: 13.5, color: "#6f6a5c" }}>Reconnectez-vous pour voir le suivi de l&apos;essai.</p>
      <button className="btn" onClick={() => { window.location.href = "/closers/login"; }}>Se reconnecter</button></div>);
  if (err && !data) return <div className="app-card"><b>Suivi de l&apos;essai</b><p style={{ color: "#b23a3a" }}>{err}</p><button className="btn" onClick={load}>Réessayer</button></div>;
  if (!data) return <div className="app-card">Chargement du suivi…</div>;

  const tot = personnes.reduce((a, x) => ({ envois: a.envois + x.nbEnvois, leads: a.leads + x.leadsUniques, tel: a.tel + x.tel, neufs: a.neufs + x.neufs }), { envois: 0, leads: 0, tel: 0, neufs: 0 });
  const parNom = Object.fromEntries(personnes.flatMap((p) => p.subs.map((s) => [s.id, p.cle])));
  const toutLogs = data.logs.filter((l) => filtre === "tous" || parNom[l.subscriber_id] === filtre || l.type === filtre).slice(0, 200);
  const subById = Object.fromEntries(data.subs.map((s) => [s.id, s]));
  const maxJ = Math.max(1, ...data.jours.map((j) => j.n));

  return (
    <div className="suivi">
      <h1 className="app-h1">Suivi de l&apos;essai · Verisure</h1>
      <div className="suivi-maj">
        <span>
          {maj ? `Mis à jour à ${maj.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "Chargement…"}
          {chargement ? " · actualisation…" : ""}
        </span>
        <button onClick={load} disabled={chargement}>Actualiser</button>
      </div>
      {expire && <div className="suivi-alerte">Votre session a expiré : les chiffres ci-dessous ne sont plus à jour. <a href="/closers/login">Se reconnecter</a></div>}
      {err && data && <div className="suivi-alerte">Dernière actualisation échouée ({err}). Les chiffres affichés datent de {maj ? maj.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "?"}.</div>}
      <p style={{ color: "#6f6a5c", fontSize: 14, margin: "4px 0 16px" }}>
        Essai de 3 mois. Chaque email envoyé aux deux directeurs régionaux (adresse professionnelle et adresse personnelle) apparaît ici, avec exactement ce qu&apos;ils ont reçu. Mise à jour automatique toutes les minutes.
      </p>

      <div className="suivi-kpis">
        <div className="app-card"><div className="kpi-n">{tot.envois}</div><div className="kpi-l">emails envoyés</div></div>
        <div className="app-card"><div className="kpi-n">{tot.leads}</div><div className="kpi-l">reprises transmises (sans doublon)</div></div>
        <div className="app-card"><div className="kpi-n">{tot.leads ? Math.round((100 * tot.tel) / tot.leads) : 0} %</div><div className="kpi-l">avec téléphone</div></div>
        <div className="app-card"><div className="kpi-n">{tot.neufs}</div><div className="kpi-l">repreneurs « budgets ouverts »</div></div>
      </div>

      <div className="suivi-grid">
        {personnes.map((p) => {
          const jPasses = p.debut ? Math.max(0, Math.floor((Date.now() - new Date(p.debut).getTime()) / 86400000)) : 0;
          const jTotal = p.debut && p.fin ? Math.round((new Date(p.fin) - new Date(p.debut)) / 86400000) : 92;
          const dernier = p.logs[0]?.created_at;
          return (
            <div className="app-card" key={p.cle}>
              <b style={{ fontSize: 16 }}>{p.nom}</b>
              <div style={{ fontSize: 12.5, color: "#6f6a5c", margin: "2px 0 8px" }}>{p.zone}</div>
              <div style={{ margin: "0 0 10px" }}>
                {p.adresses.map((a) => (
                  <div key={a.email} className="suivi-addr"><span>{a.email}</span><b>{a.envois} envoi{a.envois > 1 ? "s" : ""}</b></div>
                ))}
              </div>
              <div style={{ fontSize: 13 }}>
                <div className="suivi-row"><span>Jour d&apos;essai</span><b>{Math.min(jPasses + 1, jTotal)} / {jTotal}</b></div>
                <div className="suivi-bar"><div style={{ width: `${Math.min(100, (100 * jPasses) / jTotal)}%` }} /></div>
                <div className="suivi-row"><span>Emails envoyés (toutes adresses)</span><b>{p.nbEnvois}</b></div>
                <div className="suivi-row"><span>Reprises transmises (sans doublon)</span><b>{p.leadsUniques}</b></div>
                <div className="suivi-row"><span>Avec téléphone</span><b>{p.tel}{p.leadsUniques ? ` (${Math.round((100 * p.tel) / p.leadsUniques)} %)` : ""}</b></div>
                <div className="suivi-row"><span>Budgets ouverts</span><b>{p.neufs}</b></div>
                <div className="suivi-row"><span>Jours « creux » (filet envoyé)</span><b>{p.filets}</b></div>
                <div className="suivi-row"><span>Dernier envoi</span><b>{fmtHeure(dernier)}</b></div>
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
        <p style={{ fontSize: 12.5, color: "#6f6a5c", margin: "4px 0 10px" }}>Tous avis confondus, avant le tri « vrai commerce » : le nombre réel de commerces envoyés est plus bas. Les jours à zéro (barre rouge) sont ceux où le « filet » prend le relais.</p>
        <div className="suivi-jours">
          {[...data.jours].reverse().map((j) => (
            <div key={j.d} className="suivi-col" title={`${fmtDate(j.d)} : ${j.n} avis`}>
              <div className={`suivi-jour${j.n === 0 ? " zero" : ""}`} style={{ height: j.n === 0 ? 3 : 6 + (48 * j.n) / maxJ }}><span>{j.n}</span></div>
              <i>{new Date(j.d).getDate()}</i>
            </div>
          ))}
          {data.jours.length === 0 && <span style={{ color: "#6f6a5c", fontSize: 13 }}>Aucune donnée.</span>}
        </div>
      </div>

      <div className="app-card" style={{ marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <b>Journal des envois</b>
          <select value={filtre} onChange={(e) => setFiltre(e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e6e0d0" }}>
            <option value="tous">Tous</option>
            {personnes.map((p) => <option key={p.cle} value={p.cle}>{p.nom}</option>)}
            {Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {toutLogs.length === 0 && <p style={{ color: "#6f6a5c", fontSize: 13.5, marginTop: 10 }}>Aucun email à afficher pour ce filtre.</p>}
        {toutLogs.map((l) => (
          <div key={l.id} className="suivi-log">
            <div className="suivi-log-head" onClick={() => voir(l.id)}>
              <span className={`suivi-kind k-${l.type}`}>{KIND[l.type] || l.type}</span>
              <span style={{ flex: 1, fontSize: 13.5 }}><b>{subById[l.subscriber_id]?.nom}</b> <span style={{ color: "#6f6a5c" }}>({subById[l.subscriber_id]?.email})</span> · {l.sujet}</span>
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
