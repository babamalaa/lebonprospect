"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TARIFS, stripeDepartement } from "../lib/tarifs";
import { fr, nombre } from "../lib/typo";
import Icon from "./Icon";
import NOMS from "../lib/geo/depNames.json";

// Carte de zone (#zone). La carte est décorative : l'accès réel se fait par le code postal et les zones populaires.
// Les contours (118 Ko) sont chargés en différé, quand la section approche de l'écran. Logique et données inchangées.
const FEAT = ["69", "75", "13", "33", "44", "59", "67", "31"];
const ETIQ_MOBILE = new Set(["75", "69", "59"]);   // sur mobile, 3 étiquettes seulement (pas de chevauchement)
const nomCourt = (id) => (id === "75" ? "Paris" : NOMS[id] || id);

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
  const pret = zone?.code === zoneId;

  return (
    <section id="zone" ref={ref} className="hp-sec">
      <div className="hp-wrap">
        <div className="hp-head">
          <p className="hp-eyebrow">Votre zone</p>
          <h2 className="hp-h2">{fr("Choisissez votre zone, voyez ce qui s'y passe")}</h2>
          <p className="hp-lead">{fr("Chaque point est une reprise publiée au Journal officiel. Le nom du repreneur et son numéro sont réservés aux abonnés.")}</p>
        </div>

        <div className="hp-zm">
          <div className="hp-zm-map-col">
            <div className="hp-zm-top">
              <span className="hp-zm-crumb">{isZone ? `Zone · ${nomZone}` : "Toute la France"}</span>
              <div className="hp-zm-legend">
                <span><i className="hot" aria-hidden="true" />Dernière édition</span>
                <span><i aria-hidden="true" />30 derniers jours</span>
              </div>
            </div>

            <div className="hp-zm-map" aria-hidden="true">
              <div className="hp-zm-layer" style={{ transform }}>
                {(deps || []).map((d) => (
                  <svg key={d.id} viewBox="0 0 680 660" className="hp-zm-svg">
                    <path className="hp-zm-dep" d={d.d} onClick={() => choisir(d.id)}
                      fill={d.id === zoneId ? "rgba(49,119,122,0.22)" : isZone ? "#0F1424" : "#121829"}
                      strokeWidth={(0.7 / S).toFixed(3)} />
                  </svg>
                ))}
                {sel && (
                  <svg viewBox="0 0 680 660" className="hp-zm-svg hp-zm-sel">
                    <path d={sel.d} fill="rgba(49,119,122,0.25)" stroke="#31777A" strokeWidth={(1.6 / S).toFixed(3)}
                      strokeDasharray={`${(6 / S).toFixed(2)} ${(5 / S).toFixed(2)}`} strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div className="hp-zm-geo">
              {/* Points hors de la couche zoomée : position calculée, taille fixe de 8 px (nets à tout zoom) */}
              {isZone && pret && [...zone.pins].sort((a, b) => Number(a.hier) - Number(b.hier)).map((p, i) => (
                <span key={i} className={`hp-zm-pin${p.hier ? " hot" : ""}`}
                  style={{ left: `${(((p.x * S + tx) / 680) * 100).toFixed(3)}%`, top: `${(((p.y * S + ty) / 660) * 100).toFixed(3)}%` }} />
              ))}
              {!isZone && deps && FEAT.filter((id) => byId[id]).map((id) => {
                const b = byId[id].b; const x = (b[0] + b[2]) / 2, y = (b[1] + b[3]) / 2;
                return (
                  <button key={id} type="button" tabIndex={-1} className={`hp-zm-spot${ETIQ_MOBILE.has(id) ? "" : " d"}`} onClick={() => choisir(id)}
                    style={{ left: `${((x / 680) * 100).toFixed(2)}%`, top: `${((y / 660) * 100).toFixed(2)}%`, flexDirection: x > 520 ? "row-reverse" : "row" }}>
                    <i /><span>{nomCourt(id)}</span>
                  </button>
                );
              })}
              </div>
              {!deps && <div className="hp-zm-loading">Chargement de la carte…</div>}
            </div>
            <p className="hp-zm-credit">Contours{"\u00a0"}: svg-maps, Victor Cazanave (CC BY 4.0)</p>
          </div>

          <div className="hp-zm-panel">
            {!isZone ? (
              <>
                <div>
                  <h3 className="hp-zm-h3">Cliquez sur votre département</h3>
                  <p className="hp-zm-p">La carte zoome et affiche les reprises publiées chez vous. Sur mobile, saisissez simplement votre code postal.</p>
                </div>
                <form className="hp-zm-cp" onSubmit={goCp}>
                  <label htmlFor="zm-cp">Code postal</label>
                  <div className="hp-zm-cp-row">
                    <input id="zm-cp" type="text" inputMode="numeric" autoComplete="postal-code" placeholder="69003" value={cp}
                      onChange={(e) => { setCp(e.target.value.replace(/\D/g, "").slice(0, 5)); setCpErr(false); }}
                      aria-invalid={cpErr} aria-describedby={cpErr ? "zm-cp-err" : undefined} />
                    <button type="submit" className="hp-btn">Voir mes reprises</button>
                  </div>
                  {cpErr && <p id="zm-cp-err" className="hp-zm-err" role="alert">Code postal non reconnu en France métropolitaine.</p>}
                </form>
                <div className="hp-zm-pop">
                  <p>Zones populaires</p>
                  <div>
                    {FEAT.map((id) => (
                      <button key={id} type="button" className="hp-zm-chip" onClick={() => choisir(id)}>{nomCourt(id)}</button>
                    ))}
                  </div>
                </div>
                <div className="hp-zm-total"><b>{nombre(parMois)}</b><span>cessions publiées chaque mois en France</span></div>
              </>
            ) : (
              <>
                <button type="button" className="hp-zm-back" onClick={() => setZoneId(null)}>
                  <Icon name="chevron-left" /> France entière
                </button>
                <div>
                  <p className="hp-zm-code">Département {zoneId}</p>
                  <h3 className="hp-zm-name">{nomZone}</h3>
                </div>
                <div className="hp-zm-counters" aria-live="polite">
                  <div><b>{pret ? nombre(zone.n30) : "…"}</b><span>reprises publiées ces 30 derniers jours</span></div>
                  <div><b>{pret ? nombre(zone.nDernier) : "…"}</b><span>dans la dernière édition du Journal officiel</span></div>
                </div>
                <div className="hp-zm-list">
                  <p>Dernières reprises publiées</p>
                  <ul>
                    {(pret ? zone.liste : [null, null, null, null]).map((r, i) => (
                      <li key={i}>
                        {r ? (
                          <div><b>{fr(r.nom)}</b><span>{fr(r.commune)} · publiée le {new Date(r.date + "T12:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}</span></div>
                        ) : (
                          <div className="hp-zm-ph"><i style={{ width: "58%" }} /><i style={{ width: "34%" }} /></div>
                        )}
                        <span className="hp-zm-lock"><Icon name="lock" size={14} />repreneur et téléphone réservés aux abonnés</span>
                      </li>
                    ))}
                  </ul>
                  {pret && zone.liste.length === 0 && !chargement && <p className="hp-zm-p">Aucune reprise publiée ces 30 derniers jours dans ce département.</p>}
                </div>
                <div className="hp-zm-ctas">
                  <a className="hp-btn" href={stripeDepartement(zoneId)}>S{"\u2019"}abonner pour {nomZone} · {TARIFS.departement.prix}{"\u00a0"}€/mois <Icon name="arrow-right" /></a>
                  <a className="hp-link on-navy" href="#exemple">{fr("Voir un exemple d'email")} <Icon name="arrow-right" /></a>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
