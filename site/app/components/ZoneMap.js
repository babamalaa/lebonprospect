"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TARIFS, stripeDepartement } from "../lib/tarifs";
import NOMS from "../lib/geo/depNames.json";

// Carte de zone (#zone). La carte est décorative : l'accès réel se fait par les pastilles et le code postal.
// Les contours (118 Ko) sont chargés en différé, quand la section approche de l'écran.
const FEAT = ["69", "75", "13", "33", "44", "59", "67", "31"];
const nomCourt = (id) => (id === "75" ? "Paris" : NOMS[id] || id);
const fmt = (n) => Number(n || 0).toLocaleString("fr-FR");

function codeDepuisCp(cp) {
  const c = String(cp || "").replace(/\D/g, "");
  if (c.length !== 5) return null;
  let id = c.slice(0, 2);
  if (id === "20") id = parseInt(c, 10) < 20200 ? "2A" : "2B";
  return NOMS[id] ? id : null;
}

export default function ZoneMap({ parMois }) {
  const [deps, setDeps] = useState(null);
  const [zoneId, setZoneId] = useState(null);
  const [cp, setCp] = useState("");
  const [cpErr, setCpErr] = useState(false);
  const [zone, setZone] = useState(null);       // réponse de /api/zone
  const [chargement, setChargement] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => {
      if (e[0].isIntersecting) {
        fetch("/france-deps.json").then((r) => r.json()).then(setDeps).catch(() => setDeps([]));
        io.disconnect();
      }
    }, { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!zoneId) { setZone(null); return; }
    let ok = true;
    setChargement(true);
    fetch(`/api/zone?dep=${encodeURIComponent(zoneId)}`).then((r) => r.json())
      .then((j) => { if (ok) setZone(j.error ? null : j); }).catch(() => ok && setZone(null))
      .finally(() => ok && setChargement(false));
    return () => { ok = false; };
  }, [zoneId]);

  const choisir = (id) => { setZoneId(id); setCpErr(false); };
  const goCp = (e) => {
    e?.preventDefault();
    const id = codeDepuisCp(cp);
    if (id) choisir(id); else setCpErr(true);
  };

  const byId = useMemo(() => Object.fromEntries((deps || []).map((d) => [d.id, d])), [deps]);
  const sel = zoneId ? byId[zoneId] : null;
  let S = 1, tx = 0, ty = 0;
  if (sel) {
    const b = sel.b;
    const bw = Math.max(b[2] - b[0], 8), bh = Math.max(b[3] - b[1], 8);
    const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
    S = Math.max(1.8, Math.min((0.5 * 680) / bw, (0.5 * 660) / bh, 14));
    tx = 340 - cx * S; ty = 330 - cy * S;
  }
  const transform = `translate(${((tx / 680) * 100).toFixed(3)}%, ${((ty / 660) * 100).toFixed(3)}%) scale(${S.toFixed(3)})`;
  const isZone = !!zoneId;
  const nomZone = zoneId ? nomCourt(zoneId) : "";

  return (
    <section id="zone" ref={ref} className="h-sec h-zone">
      <div className="h-wrap">
        <p className="h-eyebrow">Votre zone</p>
        <h2 className="h-h2">Choisissez votre zone. Voyez ce qui s&apos;y passe.</h2>
        <p className="h-lead">Chaque point est une reprise publiée au Journal officiel. Le nom du repreneur et son numéro se débloquent à l&apos;abonnement.</p>

        <div className="zm">
          <div className="zm-map-col">
            <div className="zm-top">
              <span className="zm-crumb"><span className="h-dot" aria-hidden="true" />{isZone ? `Zone · ${nomZone}` : "Toute la France"}</span>
              <div className="zm-legend">
                <span><i className="zm-l zm-l-hot" aria-hidden="true" />Dernière édition</span>
                <span><i className="zm-l" aria-hidden="true" />30 derniers jours</span>
              </div>
            </div>

            <div className="zm-map" aria-hidden="true">
              <div className="zm-layer" style={{ transform }}>
                {(deps || []).map((d) => (
                  <svg key={d.id} viewBox="0 0 680 660" className="zm-svg">
                    <path className="zm-dep" d={d.d} onClick={() => choisir(d.id)}
                      fill={d.id === zoneId ? "rgba(49,119,122,0.22)" : isZone ? "#0F1424" : "#121829"}
                      strokeWidth={(0.7 / S).toFixed(3)} />
                  </svg>
                ))}
                {sel && (
                  <svg viewBox="0 0 680 660" className="zm-svg zm-sel">
                    <path d={sel.d} fill="rgba(49,119,122,0.25)" stroke="#31777A" strokeWidth={(1.8 / S).toFixed(3)}
                      strokeDasharray={`${(6 / S).toFixed(2)} ${(5 / S).toFixed(2)}`} strokeLinejoin="round" />
                  </svg>
                )}
                {isZone && zone?.code === zoneId && zone.pins.map((p, i) => (
                  <span key={i} className={`zm-pin${p.hier ? " hot" : ""}`}
                    style={{ left: `${((p.x / 680) * 100).toFixed(3)}%`, top: `${((p.y / 660) * 100).toFixed(3)}%`,
                      width: `${(14 / S).toFixed(2)}px`, height: `${(14 / S).toFixed(2)}px`,
                      boxShadow: p.hier ? `0 0 0 ${(6 / S).toFixed(2)}px rgba(49,119,122,0.40)` : `0 0 0 ${(4 / S).toFixed(2)}px rgba(107,120,150,0.25)` }} />
                ))}
              </div>
              {!isZone && deps && FEAT.filter((id) => byId[id]).map((id) => {
                const b = byId[id].b; const x = (b[0] + b[2]) / 2, y = (b[1] + b[3]) / 2;
                return (
                  <button key={id} type="button" tabIndex={-1} className="zm-spot" onClick={() => choisir(id)}
                    style={{ left: `${((x / 680) * 100).toFixed(2)}%`, top: `${((y / 660) * 100).toFixed(2)}%`, flexDirection: x > 520 ? "row-reverse" : "row" }}>
                    <span className="zm-spot-dot" /><span className="zm-spot-name">{nomCourt(id)}</span>
                  </button>
                );
              })}
              {!deps && <div className="zm-loading">Chargement de la carte…</div>}
            </div>

            <div className="zm-chips">
              <span className="zm-chips-l">Zones populaires</span>
              {FEAT.map((id) => (
                <button key={id} type="button" className={`zm-chip${id === zoneId ? " on" : ""}`} onClick={() => choisir(id)}>{nomCourt(id)}</button>
              ))}
            </div>
            <div className="zm-credit">Contours : svg-maps, Victor Cazanave (CC BY 4.0)</div>
          </div>

          <div className="zm-panel">
            {!isZone ? (
              <div className="zm-stack">
                <div>
                  <h3 className="zm-h3">Cliquez sur votre département</h3>
                  <p className="zm-p">La carte zoome et affiche les reprises publiées chez vous. Sur mobile, saisissez simplement votre code postal.</p>
                </div>
                <form className="zm-cp" onSubmit={goCp}>
                  <label htmlFor="zm-cp">Code postal</label>
                  <div className="zm-cp-row">
                    <input id="zm-cp" type="text" inputMode="numeric" autoComplete="postal-code" placeholder="69003" value={cp}
                      onChange={(e) => { setCp(e.target.value.replace(/\D/g, "").slice(0, 5)); setCpErr(false); }}
                      aria-invalid={cpErr} aria-describedby={cpErr ? "zm-cp-err" : undefined} />
                    <button type="submit" className="h-btn">Voir mes reprises</button>
                  </div>
                  {cpErr && <div id="zm-cp-err" className="zm-err" role="alert">Code postal non reconnu en France métropolitaine.</div>}
                </form>
                <div className="zm-total"><span>{fmt(parMois)}</span>cessions publiées chaque mois en France</div>
              </div>
            ) : (
              <div className="zm-stack">
                <button type="button" className="zm-back" onClick={() => setZoneId(null)}>
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  France entière
                </button>
                <div>
                  <div className="zm-code">Département {zoneId}</div>
                  <h3 className="zm-name">{nomZone}</h3>
                </div>
                <div className="zm-counters" aria-live="polite">
                  <div><b className="soft">{zone?.code === zoneId ? fmt(zone.n30) : "…"}</b><span>reprises publiées ces 30 derniers jours</span></div>
                  <div><b>{zone?.code === zoneId ? fmt(zone.nDernier) : "…"}</b><span>dans la dernière édition du Journal officiel</span></div>
                </div>
                <div className="zm-list">
                  <div className="zm-list-l">Dernières reprises publiées</div>
                  {(zone?.code === zoneId ? zone.liste : [null, null, null, null]).map((r, i) => (
                    <div className="zm-row" key={i}>
                      {r ? (
                        <div><b>{r.nom}</b><span>{r.commune} · publiée le {new Date(r.date + "T12:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}</span></div>
                      ) : (
                        <div className="zm-ph"><i style={{ width: "58%" }} /><i style={{ width: "34%" }} /></div>
                      )}
                      <div className="zm-lock">
                        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 11V8a5 5 0 0 1 10 0v3 M5 11h14v10H5z" /></svg>
                        <i aria-hidden="true" /><i aria-hidden="true" className="s" />
                        <span>repreneur et téléphone à débloquer</span>
                      </div>
                    </div>
                  ))}
                  {zone?.code === zoneId && zone.liste.length === 0 && !chargement && (
                    <p className="zm-p">Aucune reprise publiée ces 30 derniers jours dans ce département.</p>
                  )}
                </div>
                <div className="zm-ctas">
                  <a className="h-btn h-btn-lg" href={stripeDepartement(zoneId)}>
                    Débloquer {nomZone} · {TARIFS.departement.prix} €/mois
                    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18"><path d="M3 9h11M10 4.5L14.5 9 10 13.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </a>
                  <a className="h-btn-ghost" href="#exemple">Voir un exemple d&apos;email</a>
                  <div className="zm-note">Sans engagement · Résiliable en 1 clic · Données 100 % officielles</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
