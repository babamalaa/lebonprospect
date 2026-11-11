"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TARIFS, stripeDepartement } from "../lib/tarifs";
import NOMS from "../lib/geo/depNames.json";

// Section « Votre zone » (#zone), version immersive pleine page (novembre 2026).
// - Vue France : carte de chaleur RÉELLE (reprises publiées ces 30 derniers jours par département, /api/zone-heat).
// - Vue département : zoom, compteur et points rejoués dans l'ordre RÉEL des dates de publication (/api/zone, série jour par jour).
// Aucune donnée personnelle : activité ou enseigne, commune, date, lien vers l'annonce officielle.
// La carte est décorative (aria-hidden) : l'accès réel passe par le code postal, les pastilles et le bouton retour.
const FEAT = ["69", "75", "13", "33", "44", "59", "67", "31"];
const nomCourt = (id) => (id === "75" ? "Paris" : NOMS[id] || id);
const fmt = (n) => Number(n || 0).toLocaleString("fr-FR").replace(/\u202f/g, "\u00a0");
const dCourte = (d) => (d ? new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : "");
const DUREE_REPLAY = 2600;   // ms

function codeDepuisCp(cp) {
  const c = String(cp || "").replace(/\D/g, "");
  if (c.length !== 5) return null;
  let id = c.slice(0, 2);
  if (id === "20") id = parseInt(c, 10) < 20200 ? "2A" : "2B";
  return NOMS[id] ? id : null;
}

// Couleur de chaleur : du bleu nuit (peu de reprises) au bleu-vert de la marque (beaucoup). Échelle log (Paris écraserait tout).
function chaleur(n, min, max) {
  if (!n) return "#0E1322";
  const t = max > min ? (Math.log(n) - Math.log(Math.max(min, 1))) / (Math.log(max) - Math.log(Math.max(min, 1))) : 1;
  const a = [18, 24, 41], b = [49, 119, 122], c = [124, 195, 198];
  const mix = (x, y, k) => x.map((v, i) => Math.round(v + (y[i] - v) * k));
  const rgb = t < 0.75 ? mix(a, b, t / 0.75) : mix(b, c, (t - 0.75) / 0.25);
  return `rgb(${rgb.join(",")})`;
}

const reduit = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function ZoneMap({ parMois }) {
  const [deps, setDeps] = useState(null);
  const [heat, setHeat] = useState(null);
  const [zoneId, setZoneId] = useState(null);
  const [cp, setCp] = useState("");
  const [cpErr, setCpErr] = useState(false);
  const [zone, setZone] = useState(null);
  const [survol, setSurvol] = useState(null);     // { id, x, y } en px dans la carte
  const [k, setK] = useState(1);                  // avancement du replay, 0 → 1
  const ref = useRef(null);
  const carteRef = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => {
      if (e[0].isIntersecting) {
        fetch("/france-deps.json").then((r) => r.json()).then(setDeps).catch(() => setDeps([]));
        fetch("/api/zone-heat").then((r) => r.json()).then((j) => setHeat(j.error ? null : j)).catch(() => setHeat(null));
        io.disconnect();
      }
    }, { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!zoneId) { setZone(null); return; }
    let ok = true;
    fetch(`/api/zone?dep=${encodeURIComponent(zoneId)}`).then((r) => r.json())
      .then((j) => { if (ok) setZone(j.error ? null : j); }).catch(() => ok && setZone(null));
    return () => { ok = false; };
  }, [zoneId]);

  // Replay : démarre quand les données du département sont là
  const pret = zone?.code === zoneId && !!zoneId;
  useEffect(() => {
    if (!pret) return;
    if (reduit()) { setK(1); return; }
    setK(0);
    let raf, t0;
    const pas = (t) => {
      if (!t0) t0 = t + 500;                                  // laisse le zoom (0,9 s) s'engager
      const x = Math.min(1, Math.max(0, (t - t0) / DUREE_REPLAY));
      setK(1 - Math.pow(1 - x, 2));
      if (x < 1) raf = requestAnimationFrame(pas);
    };
    raf = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(raf);
  }, [pret, zoneId]);

  const choisir = (id) => { setZoneId(id); setCpErr(false); setSurvol(null); };
  const goCp = (e) => {
    e?.preventDefault();
    const id = codeDepuisCp(cp);
    if (id) choisir(id); else setCpErr(true);
  };

  const byId = useMemo(() => Object.fromEntries((deps || []).map((d) => [d.id, d])), [deps]);
  const top = useMemo(() => (heat ? Object.entries(heat.parCode).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => id) : FEAT.slice(0, 6)), [heat]);
  const sel = zoneId ? byId[zoneId] : null;
  let S = 1, tx = 0, ty = 0;
  if (sel) {
    const b = sel.b;
    const bw = Math.max(b[2] - b[0], 8), bh = Math.max(b[3] - b[1], 8);
    const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
    S = Math.max(1.8, Math.min((0.62 * 680) / bw, (0.62 * 660) / bh, 14));
    tx = 340 - cx * S; ty = 330 - cy * S;
  }
  const transform = `translate(${((tx / 680) * 100).toFixed(3)}%, ${((ty / 660) * 100).toFixed(3)}%) scale(${S.toFixed(3)})`;
  const isZone = !!zoneId;
  const nomZone = zoneId ? nomCourt(zoneId) : "";

  // Replay : jour courant dans la série réelle, compteur cumulé, points apparus
  const serie = pret ? zone.serie || [] : [];
  const iJour = serie.length ? Math.min(serie.length - 1, Math.floor(k * serie.length - 1e-9)) : -1;
  const jourCourant = iJour >= 0 ? serie[iJour].d : null;
  const cumul = k >= 1 ? (zone?.n30 || 0) : serie.slice(0, iJour + 1).reduce((s, x) => s + x.n, 0);
  const pinsVisibles = pret ? zone.pins.filter((p) => k >= 1 || (jourCourant && p.d0 <= jourCourant)) : [];

  const survolOn = (e, id) => {
    const r = carteRef.current?.getBoundingClientRect();
    if (!r) return;
    setSurvol({ id, x: e.clientX - r.left, y: e.clientY - r.top });
  };

  return (
    <section id="zone" ref={ref} className={`zx${isZone ? " is-zone" : ""}`} aria-labelledby="zx-titre">
      <div className="zx-grain" aria-hidden="true" />
      <div className="zx-in">
        {/* ============ PANNEAU ============ */}
        <div className="zx-panel">
          {!isZone ? (
            <div className="zx-stack">
              <p className="zx-eyebrow"><span className="zx-live" aria-hidden="true" />Votre zone · données réelles du Journal officiel</p>
              <h2 id="zx-titre" className="zx-h2">Que s’est-il passé <span className="soft">près de chez vous</span> ce mois{"\u2011"}ci&nbsp;?</h2>
              <p className="zx-lead">Chaque département s&apos;éclaire selon le nombre de reprises publiées ces 30 derniers jours. Tapez votre code postal, on zoome et on rejoue le mois, jour par jour.</p>
              <form className="zx-cp" onSubmit={goCp}>
                <label htmlFor="zx-cp" className="zx-sr">Code postal</label>
                <input id="zx-cp" type="text" inputMode="numeric" autoComplete="postal-code" placeholder="Votre code postal" value={cp}
                  onChange={(e) => { setCp(e.target.value.replace(/\D/g, "").slice(0, 5)); setCpErr(false); }}
                  aria-invalid={cpErr} aria-describedby={cpErr ? "zx-cp-err" : undefined} />
                <button type="submit" className="zx-go">Voir ma zone
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18"><path d="M3 9h11M10 4.5L14.5 9 10 13.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </form>
              {cpErr && <div id="zx-cp-err" className="zx-err" role="alert">Code postal non reconnu en France métropolitaine.</div>}
              <div className="zx-chips">
                <span className="zx-chips-l">{heat ? "Les plus actifs ces 30 jours" : "Zones populaires"}</span>
                <div>
                  {top.map((id) => (
                    <button key={id} type="button" className="zx-chip" onClick={() => choisir(id)}>
                      {nomCourt(id)}{heat?.parCode[id] ? <b>{fmt(heat.parCode[id])}</b> : null}
                    </button>
                  ))}
                </div>
              </div>
              <div className="zx-total">
                <b>{fmt(heat ? heat.total : parMois)}</b>
                <span>{heat ? "reprises publiées en France métropolitaine ces 30 derniers jours, toutes activités" : "cessions de fonds publiées chaque mois en France, toutes activités"}</span>
              </div>
            </div>
          ) : (
            <div className="zx-stack">
              <button type="button" className="zx-back" onClick={() => setZoneId(null)}>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                France entière
              </button>
              <div>
                <p className="zx-eyebrow">Département {zoneId}</p>
                <h2 id="zx-titre" className="zx-name">{nomZone}</h2>
              </div>
              <div className="zx-big">
                <b className="soft">{pret ? fmt(cumul) : "…"}</b>
                <span>reprises publiées {pret && k < 1 && jourCourant ? <>au <em>{dCourte(jourCourant)}</em></> : "ces 30 derniers jours"}</span>
              </div>
              <p className="zx-sr" aria-live="polite">{pret ? `${nomZone} : ${zone.n30} reprises publiées ces 30 derniers jours, dont ${zone.nDernier} dans la dernière édition.` : ""}</p>
              <div className="zx-spark" aria-hidden="true">
                {serie.map((x, i) => (
                  <i key={x.d} className={i <= iJour || k >= 1 ? "on" : ""} style={{ height: `${Math.max(8, (x.n / Math.max(...serie.map((y) => y.n), 1)) * 100)}%` }} />
                ))}
              </div>
              <div className="zx-sub">
                <span><b>{pret ? fmt(zone.nDernier) : "…"}</b> dans la dernière édition{pret && zone.derniere ? ` (${dCourte(zone.derniere)})` : ""}</span>
              </div>
              <div className="zx-list">
                {(pret ? zone.liste : [null, null, null, null]).map((r, i) => (
                  <div className="zx-row" key={i} style={{ animationDelay: `${0.15 + i * 0.08}s` }}>
                    {r ? (
                      <>
                        <div className="zx-row-t"><b>{r.nom}</b><span>{r.commune} · {new Date(r.date + "T12:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}</span></div>
                        <div className="zx-row-l">
                          <span className="zx-lock"><svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 11V8a5 5 0 0 1 10 0v3 M5 11h14v10H5z" /></svg>repreneur et téléphone</span>
                          {r.annonce && <a href={r.annonce} target="_blank" rel="noopener noreferrer">annonce officielle</a>}
                        </div>
                      </>
                    ) : <div className="zx-ph"><i style={{ width: "58%" }} /><i style={{ width: "34%" }} /></div>}
                  </div>
                ))}
                {pret && zone.liste.length === 0 && <p className="zx-lead">Aucune reprise publiée ces 30 derniers jours dans ce département.</p>}
              </div>
              <div className="zx-ctas">
                <a className="zx-go big" href={stripeDepartement(zoneId)}>
                  Débloquer {nomZone} · {TARIFS.departement.prix} €/mois
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18"><path d="M3 9h11M10 4.5L14.5 9 10 13.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </a>
                <div className="zx-note">Sans engagement · Résiliable en 1 clic · <a href="#exemple">voir un exemple d&apos;email</a></div>
              </div>
            </div>
          )}
        </div>

        {/* ============ CARTE ============ */}
        <div className="zx-map-col">
          <div className="zx-map" ref={carteRef} aria-hidden="true" onMouseLeave={() => setSurvol(null)}>
            <div className="zx-layer" style={{ transform }}>
              {(deps || []).map((d) => {
                const n = heat?.parCode[d.id] || 0;
                const fill = isZone ? (d.id === zoneId ? "rgba(49,119,122,0.18)" : "#0B0F1C") : heat ? chaleur(n, heat.min, heat.max) : "#121829";
                return (
                  <svg key={d.id} viewBox="0 0 680 660" className="zx-svg">
                    <path className="zx-dep" d={d.d} fill={fill} strokeWidth={(0.6 / S).toFixed(3)}
                      onClick={() => choisir(d.id)} onMouseMove={(e) => !isZone && survolOn(e, d.id)} />
                  </svg>
                );
              })}
              {sel && (
                <svg viewBox="0 0 680 660" className="zx-svg zx-sel">
                  <path d={sel.d} fill="none" stroke="#7CC3C6" strokeWidth={(1.6 / S).toFixed(3)} strokeLinejoin="round" />
                </svg>
              )}
              {pinsVisibles.map((p) => {
                const dpx = Math.min(9 + 3 * Math.sqrt((p.n || 1) - 1), 20) / S;
                return (
                  <span key={`${p.x},${p.y}`} className={`zx-pin${p.hier ? " hot" : ""}`}
                    style={{ left: `${((p.x / 680) * 100).toFixed(3)}%`, top: `${((p.y / 660) * 100).toFixed(3)}%`, width: `${dpx.toFixed(2)}px`, height: `${dpx.toFixed(2)}px` }} />
                );
              })}
            </div>
            {survol && !isZone && heat && (
              <div className="zx-tip" style={{ left: survol.x, top: survol.y }}>
                <b>{nomCourt(survol.id)}</b><span>{fmt(heat.parCode[survol.id] || 0)} reprises en 30 jours</span>
              </div>
            )}
            {!deps && <div className="zx-loading">Chargement de la carte…</div>}
          </div>
          <div className="zx-legend">
            {!isZone ? (
              <>
                <span>Moins de reprises</span><i className="zx-grad" aria-hidden="true" /><span>Plus de reprises</span>
              </>
            ) : (
              <>
                <span><i className="zx-dot hot" aria-hidden="true" />Dernière édition</span>
                <span><i className="zx-dot" aria-hidden="true" />30 derniers jours, un point par commune</span>
              </>
            )}
          </div>
          <div className="zx-credit">Contours : svg-maps, Victor Cazanave (CC BY 4.0) · Source : BODACC</div>
        </div>
      </div>
    </section>
  );
}
