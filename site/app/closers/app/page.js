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
const fmt2 = (n) => Math.round(n).toLocaleString("fr-FR");
const TAB_LABELS = { accueil: "Accueil", prospects: "Mes prospects", documents: "Documents", script: "Scripts d'appel" };

const SCRIPTS = [
  {
    id: "evenement",
    label: "L'événement (par défaut)",
    desc: "Ouvre sur une reprise réelle et récente. Le plus direct, fonctionne sur la majorité des cibles.",
    blocks: [
      {
        title: "Accroche (10 secondes)",
        style: "",
        text: `« Bonjour [Prénom], Lawrenza de LeBonProspect. [Le Bousti], un resto à [Marseille], vient de changer de propriétaire, publié jeudi au Journal officiel. Le repreneur rééquipe en ce moment. C'est exactement le genre de client que vous cherchez, non ? »`,
      },
      {
        title: "Le pitch (si l'accroche passe)",
        style: "",
        text: `« On détecte chaque matin les commerces qui changent de propriétaire dans votre secteur. Nos abonnés reçoivent la liste à 8h avec le nom du repreneur et le téléphone de l'établissement, pour être les premiers à appeler. »`,
      },
      {
        title: "Le moment décisif",
        style: "teal",
        text: `« Je vous envoie votre page pendant qu'on parle... vous y êtes ? » Puis 10 à 15 secondes de silence pendant qu'il scrolle. Ne rien dire, laisser la page travailler.`,
      },
      {
        title: "Discovery (2 questions)",
        style: "",
        text: `1. « Aujourd'hui, comment vous trouvez vos clients ? »
2. « Vous payez combien pour un lead en ce moment ? » (pivot ensuite sur le coût par prospect nominatif LeBonProspect)`,
      },
      {
        title: "Objections fréquentes",
        style: "",
        list: [
          "« C'est public, je peux le faire moi-même » → « Comptez 1h/jour pour trier, identifier, trouver le numéro. Nous, 8h du matin, 5€/jour. Votre heure vaut plus que ça. »",
          "« Envoyez-moi une doc » → « La doc, c'est la page sous vos yeux. Mieux : demain 8h vous recevez le vrai digest de votre zone. »",
          "« Trop cher » → « 3,50 à 5,50€ le prospect nominatif non partagé, vous payez combien ailleurs ? »",
          "« Je dois en parler à mon associé » → « Bien sûr. Je vous envoie la page, vous la regardez ensemble. Je vous rappelle demain à quelle heure ? »",
        ],
      },
      {
        title: "Le close",
        style: "dark",
        text: `« Région à 299 ou département à 149, vous préférez lequel ? » Puis restez en ligne pendant le paiement, ne raccrochez pas avant confirmation.`,
      },
    ],
  },
  {
    id: "concurrent",
    label: "Le concurrent",
    desc: "Joue sur l'aversion à la perte plutôt que le gain. Efficace sur les profils compétiteurs, un peu plus direct.",
    blocks: [
      {
        title: "Accroche (question ouverte)",
        style: "",
        text: `« Bonjour [Prénom], Lawrenza de LeBonProspect. Une question directe : quand un restaurant change de propriétaire à [Nice], aujourd'hui, vous l'apprenez comment ? » (laisser répondre, sa réponse est la démonstration du problème) « ...Parce qu'en ce moment il y en a 88 par mois dans votre région, et quelqu'un les équipe. Si ce n'est pas vous, c'est un concurrent. »`,
      },
      {
        title: "Enchaînement",
        style: "",
        text: `« On détecte ces reprises chaque matin, avec le téléphone du repreneur. Ceux qui appellent en premier prennent le marché. Je vous montre ce que ça donne concrètement ? »`,
      },
      {
        title: "Le moment décisif",
        style: "teal",
        text: `« Je vous envoie votre page pendant qu'on parle... vous y êtes ? » Silence 10-15 secondes.`,
      },
      {
        title: "Objections fréquentes",
        style: "",
        list: [
          "« Mes concurrents ne font pas ça » → « Justement, c'est le moment d'avoir une longueur d'avance avant que ça se sache. »",
          "« Je n'ai pas le temps d'appeler tous les matins » → « 5 minutes le matin pour scanner la liste. Le reste, c'est vous qui décidez qui vaut le coup. »",
          "« Trop cher » → « Comparé à perdre un client à 20-200k€ de panier moyen au profit d'un concurrent qui a appelé avant vous ? »",
        ],
      },
      {
        title: "Le close",
        style: "dark",
        text: `« On démarre sur votre département à 149 ou directement la région à 299 ? » Rester en ligne pendant le paiement.`,
      },
    ],
  },
  {
    id: "timing",
    label: "Le mauvais timing",
    desc: "Valide l'expertise du prospect puis nomme un insight métier qu'il vit sans l'avoir formulé. Le plus long à placer, très efficace sur cycles de vente longs (agenceurs, matériel).",
    blocks: [
      {
        title: "Accroche (valorisation + insight)",
        style: "",
        text: `« Bonjour [Prénom], Lawrenza de LeBonProspect. Vous le savez mieux que moi : quand un commerçant a besoin d'une [enseigne / caisse / cuisine], en général il a déjà choisi son fournisseur avant même de vous appeler. Le seul moment où tout est encore ouvert, c'est les premières semaines d'une reprise. Nous, on vous dit exactement qui vient de reprendre, chaque matin. »`,
      },
      {
        title: "Enchaînement",
        style: "",
        text: `« Ça vous est déjà arrivé de rater une reprise parce que vous l'avez su trop tard ? » (laisser répondre, souvent oui) « C'est exactement ce qu'on résout. »`,
      },
      {
        title: "Le moment décisif",
        style: "teal",
        text: `« Je vous envoie votre page pendant qu'on parle... vous y êtes ? » Silence 10-15 secondes.`,
      },
      {
        title: "Objections fréquentes",
        style: "",
        list: [
          "« On a déjà nos clients réguliers » → « Bien sûr, et ça reste votre socle. Ça, c'est pour capter les nouveaux avant qu'ils choisissent quelqu'un d'autre. »",
          "« On fait déjà de la prospection » → « Sur quel volume de reprises par mois ? En général les gens n'en voient qu'une fraction, faute de temps. »",
          "« Il faut que je regarde avec mon équipe » → « Logique. Je vous envoie la page, vous leur montrez. On se recale quand ? »",
        ],
      },
      {
        title: "Le close",
        style: "dark",
        text: `« Pour démarrer, département ou région ? » Rester en ligne pendant le paiement.`,
      },
    ],
  },
  {
    id: "transparence",
    label: "La transparence désarmante",
    desc: "Casse le réflexe de défense en nommant soi-même l'appel commercial. Excellent sur profil pressé ou méfiant, demande un ton détendu.",
    blocks: [
      {
        title: "Accroche (pattern break)",
        style: "",
        text: `« Bonjour [Prénom], Lawrenza de LeBonProspect. Je vais être honnête : c'est un appel commercial, mais j'ai un truc à vous montrer qui prend 30 secondes et qui concerne [le Bousti, repris à Marseille jeudi]. Je vous envoie un lien, vous regardez, et vous me dites si je vous fais perdre votre temps. Ça marche ? »`,
      },
      {
        title: "Le moment décisif (enchaîne directement)",
        style: "teal",
        text: `« Je vous l'envoie... vous l'avez ? » Silence 10-15 secondes pendant qu'il scrolle. Le ton doit rester léger, presque amusé.`,
      },
      {
        title: "S'il dit « pas intéressé » après avoir vu la page",
        style: "",
        text: `« Aucun souci, merci d'avoir regardé. Une dernière chose : si jamais un jour un concurrent vous prend un client parce qu'il a appelé avant vous, vous saurez que ça existe. » (raccrocher proprement, laisser une bonne impression pour un futur contact)`,
      },
      {
        title: "Objections fréquentes",
        style: "",
        list: [
          "« Vous avez eu mon numéro où ? » → « Fiche professionnelle publique, comme tout le monde. »",
          "« Pourquoi moi ? » → « Vous êtes dans le secteur qui achète après une reprise, c'est tout. »",
        ],
      },
      {
        title: "Le close",
        style: "dark",
        text: `« Si ça vous parle : département à 149 ou région à 299 ? » Rester en ligne pendant le paiement.`,
      },
    ],
  },
];

export default function AppPage() {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("accueil");
  const [rows, setRows] = useState([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [refilling, setRefilling] = useState(false);
  const [refillMsg, setRefillMsg] = useState("");
  const [filterStatut, setFilterStatut] = useState("tous");
  const [filterCloser, setFilterCloser] = useState("tous");
  const [scriptId, setScriptId] = useState("evenement");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const authedFetch = useCallback(
    async (url, opts = {}) => {
      const token = session?.access_token;
      return fetch(url, { ...opts, headers: { ...(opts.headers || {}), Authorization: `Bearer ${token}` } });
    },
    [session]
  );

  useEffect(() => { if (session === null) window.location.href = "/closers/login"; }, [session]);
  useEffect(() => { if (session) authedFetch("/api/me").then((r) => r.json()).then(setProfile); }, [session, authedFetch]);

  const loadRows = useCallback(() => {
    if (!session) return;
    setLoadingRows(true);
    authedFetch("/api/prospects").then((r) => r.json()).then((d) => { setRows(Array.isArray(d) ? d : []); setLoadingRows(false); });
  }, [session, authedFetch]);

  useEffect(() => { if (session) loadRows(); }, [session, loadRows]);

  const patch = async (id, fields) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...fields } : r)));
    await authedFetch("/api/prospects", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...fields }) });
  };

  const doRefill = async (region) => {
    setRefilling(true); setRefillMsg("");
    const res = await authedFetch("/api/refill", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ region: region || undefined }) });
    const data = await res.json();
    setRefilling(false);
    if (data.n > 0) { setRefillMsg(`✓ ${data.n} nouveaux prospects ajoutés à votre liste.`); loadRows(); }
    else setRefillMsg(data.message || "Rien de nouveau pour le moment.");
  };

  const logout = async () => { await supabase.auth.signOut(); window.location.href = "/closers/login"; };

  if (session === undefined || (session && !profile)) return <div className="app-loading">Chargement…</div>;
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
  const activeScript = SCRIPTS.find((s) => s.id === scriptId) || SCRIPTS[0];

  // --- Calcul commissions & paliers (basé sur les prospects signés du closer courant) ---
  const signedDeals = rows.filter((r) => r.statut === "signe");
  const nSigned = signedDeals.length;
  const planLabel = { departemental: "Départemental", regional: "Régional", national: "National" };
  const planPrice = { departemental: 149, regional: 299, national: 0 };
  const dealsByPlan = { departemental: 0, regional: 0, national: 0, sans_plan: 0 };
  let commissionEstimee = 0;
  signedDeals.forEach((r) => {
    const plan = r.plan;
    if (plan && dealsByPlan[plan] !== undefined) dealsByPlan[plan] += 1;
    else dealsByPlan.sans_plan += 1;
    const montant = r.montant || planPrice[plan] || 0;
    commissionEstimee += montant * 0.25; // hypothèse conservatrice: sans engagement, 25% du 1er mois
  });
  const palier1 = 5, palier2 = 10;
  const bonusActuel = nSigned >= palier2 ? 200 : nSigned >= palier1 ? 50 : 0;
  const prochainPalier = nSigned < palier1 ? palier1 : nSigned < palier2 ? palier2 : null;
  const dealsRestants = prochainPalier ? prochainPalier - nSigned : 0;
  const progressPct = prochainPalier
    ? Math.min(100, (nSigned / prochainPalier) * 100)
    : 100;

  // --- Donut répartition des deals signés par plan ---
  const donutData = [
    { key: "departemental", label: "Départemental", value: dealsByPlan.departemental, color: "#31777A" },
    { key: "regional", label: "Régional", value: dealsByPlan.regional, color: "#14181d" },
    { key: "national", label: "National", value: dealsByPlan.national, color: "#d64a2e" },
    { key: "sans_plan", label: "Non renseigné", value: dealsByPlan.sans_plan, color: "#c9c2ab" },
  ].filter((d) => d.value > 0);
  const donutTotal = donutData.reduce((a, d) => a + d.value, 0) || 1;
  let donutAcc = 0;
  const donutSegments = donutData.map((d) => {
    const pct = d.value / donutTotal;
    const seg = { ...d, offset: donutAcc, pct };
    donutAcc += pct;
    return seg;
  });
  const CIRC = 2 * Math.PI * 40; // rayon 40

  return (
    <main className="app">
      {/* Header mobile compact : logo + hamburger */}
      <div className="app-mobile-header">
        <div className="app-logo">
          <span className="mark">
            <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
              <path d="M2 13 L7 5 L11 10 L16 3" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="16" cy="3" r="2.2" fill="#d64a2e" />
            </svg>
          </span>
          LeBonProspect
        </div>
        <button className="app-burger" onClick={() => setMobileMenuOpen(true)} aria-label="Menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
            <line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </button>
      </div>

      {/* Panneau hamburger mobile (plein écran) */}
      {mobileMenuOpen && (
        <div className="app-mobile-panel">
          <div className="app-mobile-panel-top">
            <div className="app-logo">
              <span className="mark">
                <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                  <path d="M2 13 L7 5 L11 10 L16 3" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="16" cy="3" r="2.2" fill="#d64a2e" />
                </svg>
              </span>
              LeBonProspect
            </div>
            <button className="app-burger" onClick={() => setMobileMenuOpen(false)} aria-label="Fermer">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
                <line x1="5" y1="5" x2="19" y2="19" /><line x1="19" y1="5" x2="5" y2="19" />
              </svg>
            </button>
          </div>
          <div className="app-who app-who-mobile">
            <b>{profile?.full_name}</b>
            <span>{profile?.role === "admin" ? "Admin" : "Closer"}</span>
          </div>
          <nav className="app-nav app-nav-mobile">
            {Object.entries(TAB_LABELS).map(([key, label]) => (
              <button
                key={key}
                className={tab === key ? "active" : ""}
                onClick={() => { setTab(key); setMobileMenuOpen(false); }}
              >
                {label}
              </button>
            ))}
          </nav>
          <button className="app-logout app-logout-mobile" onClick={logout}>Se déconnecter</button>
        </div>
      )}

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
          <button className={tab === "script" ? "active" : ""} onClick={() => setTab("script")}>Scripts d&apos;appel</button>
        </nav>
        <div className="app-side-foot">
          <div className="app-who"><b>{profile?.full_name}</b><span>{profile?.role === "admin" ? "Admin" : "Closer"}</span></div>
          <button className="app-logout" onClick={logout}>Se déconnecter</button>
        </div>
      </aside>

      <section className="app-main">
        {tab === "accueil" && (
          <div className="app-panel narrow">
            <h1 className="app-h1">Bonjour {profile?.full_name?.split(" ")[0]} 👋</h1>
            <p className="app-lead">Voici où vous en êtes.</p>

            <div className="dash-stats" style={{ marginTop: 20 }}>
              <div className="dash-stat"><div className="n">{stats.total}</div><div className="l">prospects assignés</div></div>
              <div className="dash-stat"><div className="n">{stats.aTraiter}</div><div className="l">à contacter</div></div>
              <div className="dash-stat hot"><div className="n">{stats.chaud}</div><div className="l">chauds</div></div>
              <div className="dash-stat ok"><div className="n">{stats.signe}</div><div className="l">signés</div></div>
            </div>

            {profile?.role !== "admin" && (
              <>
                {/* Commission estimée + paliers */}
                <div className="perf-row">
                  <div className="perf-card">
                    <div className="perf-label">Commission estimée ce mois</div>
                    <div className="perf-value">{fmt2(commissionEstimee + bonusActuel)} €</div>
                    <div className="perf-sub">
                      {fmt2(commissionEstimee)} € sur deals signés
                      {bonusActuel > 0 && <> + {bonusActuel} € de palier</>}
                    </div>
                  </div>
                  <div className="perf-card">
                    <div className="perf-label">Paliers de volume</div>
                    <div className="perf-bar-wrap">
                      <div className="perf-bar"><div className="perf-bar-fill" style={{ width: `${progressPct}%` }} /></div>
                      <div className="perf-bar-marks">
                        <span style={{ left: "50%" }}>5 → +50€</span>
                        <span style={{ left: "100%" }}>10 → +150€</span>
                      </div>
                    </div>
                    <div className="perf-sub" style={{ marginTop: 22 }}>
                      {prochainPalier
                        ? <>Plus que <b>{dealsRestants}</b> deal{dealsRestants > 1 ? "s" : ""} avant le prochain palier ({prochainPalier === palier1 ? "+50€" : "+150€"})</>
                        : <>Tous les paliers sont atteints ce mois-ci 🎉</>}
                    </div>
                  </div>
                </div>

                {/* Répartition des deals signés */}
                {nSigned > 0 && (
                  <div className="perf-card" style={{ marginTop: 16 }}>
                    <div className="perf-label" style={{ marginBottom: 14 }}>Répartition de vos {nSigned} deal{nSigned > 1 ? "s" : ""} signé{nSigned > 1 ? "s" : ""}</div>
                    <div className="donut-row">
                      <svg width="110" height="110" viewBox="0 0 110 110">
                        <circle cx="55" cy="55" r="40" fill="none" stroke="#efe9d8" strokeWidth="15" />
                        {donutSegments.map((seg) => (
                          <circle
                            key={seg.key}
                            cx="55" cy="55" r="40" fill="none"
                            stroke={seg.color} strokeWidth="15"
                            strokeDasharray={`${seg.pct * CIRC} ${CIRC}`}
                            strokeDashoffset={-seg.offset * CIRC}
                            transform="rotate(-90 55 55)"
                          />
                        ))}
                        <text x="55" y="60" textAnchor="middle" fontFamily="Archivo" fontWeight="900" fontSize="22" fill="#14181d">{nSigned}</text>
                      </svg>
                      <div className="donut-legend">
                        {donutSegments.map((seg) => (
                          <div key={seg.key} className="donut-legend-item">
                            <span className="dot" style={{ background: seg.color }} />
                            {seg.label} — {seg.value}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="cl-card dark" style={{ marginTop: 20 }}>
                  <h3 style={{ color: "#fff", marginBottom: 8 }}>Recevoir de nouveaux leads</h3>
                  <p style={{ marginBottom: 14 }}>Piochez de nouveaux prospects CHR dans le vivier, non assignés à un autre closer. Par lot de 15.</p>
                  <div className="app-refill-row">
                    <button className="btn" onClick={() => doRefill(null)} disabled={refilling}>{refilling ? "..." : "+ 15 nouveaux leads (toutes zones)"}</button>
                    {REGIONS.map((r) => (
                      <button key={r} className="btn" onClick={() => doRefill(r)} disabled={refilling}>{refilling ? "..." : `+ ${r}`}</button>
                    ))}
                  </div>
                  {refillMsg && <p style={{ marginTop: 12, color: "#a9d2d3", fontWeight: 700 }}>{refillMsg}</p>}
                </div>
              </>
            )}

            <div className="cl-card teal" style={{ marginTop: 20 }}>
              <p>Besoin d&apos;un script d&apos;appel ou de la plaquette ? Tout est dans les onglets <b>Documents</b> et <b>Scripts d&apos;appel</b>.</p>
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
              <>
                {/* Desktop : vrai tableau */}
                <div className="dash-table-wrap dash-desktop-only" style={{ marginTop: 16 }}>
                  <table className="dash-table">
                    <thead>
                      <tr><th>Société</th><th>Zone</th><th>Tél.</th><th>Lien</th><th>Statut</th><th>Plan</th><th>Prochaine action</th><th>Notes</th></tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((r) => (
                        <tr key={r.id}>
                          <td><b>{r.societe}</b><div className="dash-sub">{r.categorie}</div></td>
                          <td className="dash-sub">{r.region}<br />{r.ville}</td>
                          <td>{r.telephone && <a href={`tel:${r.telephone.replace(/\s/g, "")}`} className="mono">{r.telephone}</a>}</td>
                          <td>{r.lien_teaser && <a href={r.lien_teaser} target="_blank" rel="noreferrer" className="dash-link">voir →</a>}</td>
                          <td>
                            <select value={r.statut || "a_contacter"} onChange={(e) => patch(r.id, { statut: e.target.value })} style={{ color: STATUT_COLOR[r.statut] || "#14181d", fontWeight: 700 }}>
                              {STATUTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
                            </select>
                          </td>
                          <td>
                            {r.statut === "signe" ? (
                              <select
                                value={r.plan || ""}
                                onChange={(e) => {
                                  const plan = e.target.value;
                                  const montant = plan === "departemental" ? 149 : plan === "regional" ? 299 : r.montant || 0;
                                  patch(r.id, { plan, montant });
                                }}
                                style={{ fontWeight: 700 }}
                              >
                                <option value="">— choisir —</option>
                                <option value="departemental">Départemental (149€)</option>
                                <option value="regional">Régional (299€)</option>
                                <option value="national">National (sur devis)</option>
                              </select>
                            ) : (
                              <span className="dash-sub">—</span>
                            )}
                          </td>
                          <td><input className="dash-input" defaultValue={r.prochaine_action || ""} placeholder="ex: rappel jeudi" onBlur={(e) => e.target.value !== r.prochaine_action && patch(r.id, { prochaine_action: e.target.value })} /></td>
                          <td><input className="dash-input wide" defaultValue={r.notes || ""} placeholder="objections…" onBlur={(e) => e.target.value !== r.notes && patch(r.id, { notes: e.target.value })} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredRows.length === 0 && <p style={{ padding: "30px 0", textAlign: "center", color: "#6f6a5c" }}>Aucun prospect pour le moment. Allez sur Accueil pour en récupérer.</p>}
                </div>

                {/* Mobile : cartes empilées */}
                <div className="prospect-cards dash-mobile-only">
                  {filteredRows.map((r) => (
                    <div key={r.id} className="prospect-card">
                      <div className="prospect-card-head">
                        <div>
                          <b>{r.societe}</b>
                          <div className="dash-sub">{r.categorie} · {r.region}{r.ville ? ` · ${r.ville}` : ""}</div>
                        </div>
                        {r.lien_teaser && <a href={r.lien_teaser} target="_blank" rel="noreferrer" className="dash-link">voir →</a>}
                      </div>
                      {r.telephone && (
                        <a href={`tel:${r.telephone.replace(/\s/g, "")}`} className="prospect-card-tel mono">☎ {r.telephone}</a>
                      )}
                      <div className="prospect-card-row">
                        <label>Statut</label>
                        <select value={r.statut || "a_contacter"} onChange={(e) => patch(r.id, { statut: e.target.value })} style={{ color: STATUT_COLOR[r.statut] || "#14181d", fontWeight: 700 }}>
                          {STATUTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
                        </select>
                      </div>
                      {r.statut === "signe" && (
                        <div className="prospect-card-row">
                          <label>Plan</label>
                          <select
                            value={r.plan || ""}
                            onChange={(e) => {
                              const plan = e.target.value;
                              const montant = plan === "departemental" ? 149 : plan === "regional" ? 299 : r.montant || 0;
                              patch(r.id, { plan, montant });
                            }}
                            style={{ fontWeight: 700 }}
                          >
                            <option value="">— choisir —</option>
                            <option value="departemental">Départemental (149€)</option>
                            <option value="regional">Régional (299€)</option>
                            <option value="national">National (sur devis)</option>
                          </select>
                        </div>
                      )}
                      <div className="prospect-card-row">
                        <label>Prochaine action</label>
                        <input className="dash-input" defaultValue={r.prochaine_action || ""} placeholder="ex: rappel jeudi" onBlur={(e) => e.target.value !== r.prochaine_action && patch(r.id, { prochaine_action: e.target.value })} />
                      </div>
                      <div className="prospect-card-row">
                        <label>Notes</label>
                        <input className="dash-input" defaultValue={r.notes || ""} placeholder="objections…" onBlur={(e) => e.target.value !== r.notes && patch(r.id, { notes: e.target.value })} />
                      </div>
                    </div>
                  ))}
                  {filteredRows.length === 0 && <p style={{ padding: "30px 0", textAlign: "center", color: "#6f6a5c" }}>Aucun prospect pour le moment. Allez sur Accueil pour en récupérer.</p>}
                </div>
              </>
            )}
          </div>
        )}

        {tab === "documents" && (
          <div className="app-panel narrow">
            <h1 className="app-h1">Documents</h1>
            <p className="app-lead">Tout ce dont vous avez besoin, toujours à jour.</p>
            <div className="app-docs">
              <a className="app-doc" href="/closers" target="_blank" rel="noreferrer">
                <b>Kit de démarrage complet →</b>
                <span>Produit, rémunération, do&apos;s &amp; don&apos;ts, processus</span>
              </a>
              <div className="app-doc" onClick={() => setTab("script")}>
                <b>Scripts d&apos;appel →</b>
                <span>4 approches différentes, objections, closing</span>
              </div>
            </div>
          </div>
        )}

        {tab === "script" && (
          <div className="app-panel narrow">
            <h1 className="app-h1">Scripts d&apos;appel</h1>
            <p className="app-lead" style={{ marginBottom: 16 }}>Choisissez celui que vous maîtrisez le mieux, ou alternez selon le profil au téléphone.</p>

            <div className="script-tabs">
              {SCRIPTS.map((s) => (
                <button key={s.id} className={`script-tab ${scriptId === s.id ? "active" : ""}`} onClick={() => setScriptId(s.id)}>
                  {s.label}
                </button>
              ))}
            </div>

            <p className="script-note">{activeScript.desc}</p>

            <div className="script-block">
              {activeScript.blocks.map((b, i) => (
                <div key={i} className={`cl-card ${b.style}`}>
                  <b style={{ display: "block", marginBottom: 8, color: b.style === "dark" ? "#fff" : b.style === "teal" ? "#14181d" : "#31777A" }}>{b.title}</b>
                  {b.text && <p style={{ whiteSpace: "pre-line" }}>{b.text}</p>}
                  {b.list && (
                    <ul className="cl-list">
                      {b.list.map((l, j) => <li key={j}>{l}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
