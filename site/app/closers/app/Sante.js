"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Tableau de santé (admin, lecture seule) : une ligne par jour, verte ou rouge, avec la raison.
const fmtJour = (d) => new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });

export default function Sante({ authedFetch }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [maj, setMaj] = useState(null);
  const fetchRef = useRef(authedFetch);
  useEffect(() => { fetchRef.current = authedFetch; }, [authedFetch]);

  const load = useCallback(async () => {
    try {
      const r = await fetchRef.current("/api/sante", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erreur");
      setData(j); setErr(""); setMaj(new Date());
    } catch (e) { setErr((p) => p || e.message); }
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 120000);
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVisible); };
  }, [load]);
  useEffect(() => { load(); }, [authedFetch, load]);

  if (!data) return <div className="app-card">{err ? `Erreur : ${err}` : "Chargement…"}</div>;
  const auj = data.jours[0];
  const rouges = data.jours.filter((j) => !j.ok).length;

  return (
    <div>
      <h1 className="app-h1">Santé du service</h1>
      <p className="sante-maj">
        {maj ? `Mis à jour à ${maj.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : ""}
        {" · "}<button className="sante-btn" onClick={load}>Actualiser</button>
      </p>

      <div className="suivi-kpis">
        <div className="app-card"><div className="kpi-n" style={{ color: auj.ok ? "#31777A" : "#c0392b" }}>{auj.ok ? "OK" : "À voir"}</div><div className="kpi-l">Aujourd&apos;hui</div></div>
        <div className="app-card"><div className="kpi-n">{auj.servis}/{auj.abonnes}</div><div className="kpi-l">Abonnés servis aujourd&apos;hui</div></div>
        <div className="app-card"><div className="kpi-n">{data.coutMois.toFixed(2)}&nbsp;€</div><div className="kpi-l">Coût Google estimé ce mois ({data.reqMois} recherches)</div></div>
        <div className="app-card"><div className="kpi-n" style={{ color: rouges ? "#c0392b" : "#31777A" }}>{rouges}</div><div className="kpi-l">Jour(s) à problème sur 14</div></div>
      </div>

      <div className="app-card sante-table-wrap">
        <table className="sante-table">
          <thead>
            <tr><th>Jour</th><th>Avis BODACC</th><th>Envois</th><th>Livraison</th><th>Google</th><th>État</th></tr>
          </thead>
          <tbody>
            {data.jours.map((j) => (
              <tr key={j.d} className={j.ok ? "" : "sante-ko"}>
                <td><b>{fmtJour(j.d)}</b></td>
                <td>{j.avis || <span className="sante-muted">pas de parution</span>}{j.ingestion === false && <span className="sante-err"> · échec</span>}</td>
                <td>{j.servis}/{j.abonnes} abonnés · {j.emails} email{j.emails > 1 ? "s" : ""}{j.fichesClients ? <span className={j.fichesTel ? "sante-muted" : "sante-err"}> · {j.fichesTel}/{j.fichesClients} fiches avec n°</span> : ""}</td>
                <td>{j.suiviLivraison
                  ? <>{j.livres} livré{j.livres > 1 ? "s" : ""}{j.rejetes ? <span className="sante-err"> · {j.rejetes} rejeté{j.rejetes > 1 ? "s" : ""}</span> : ""}{j.sansStatut ? <span className="sante-muted"> · {j.sansStatut} en attente</span> : ""}</>
                  : <span className="sante-muted">non suivie</span>}</td>
                <td>{j.google.requetes} rech. · {j.google.cout.toFixed(2)}&nbsp;€ · {j.google.validees}/{j.google.cherchees} n°{j.google.erreur && <span className="sante-err"> · refus</span>}</td>
                <td>{j.ok ? <span className="sante-ok">OK</span> : <span className="sante-err">{j.problemes.join(" · ")}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="sante-h2">Dernières alertes envoyées</h2>
      <div className="app-card">
        {data.alertes.length === 0 ? <span className="sante-muted">Aucune alerte sur 15 jours.</span> :
          data.alertes.map((a, i) => (
            <div key={i} className="suivi-row"><span>{new Date(a.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {a.workflow.replace("alerte-", "")}</span><span className="sante-muted">{(a.note || "").slice(0, 90)}</span></div>
          ))}
      </div>
      <p className="sante-note">La livraison réelle (livré, rejeté, signalé comme spam) est suivie depuis le 9 novembre 2026. Le coût Google est une estimation (0,03 € par recherche) à comparer avec la facture.</p>
    </div>
  );
}
