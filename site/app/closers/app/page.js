"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import { ToastProvider, useToast } from "../../lib/ToastContext";
import SCRIPTS_V2 from "./scripts";

const STATUTS = [
  { v: "a_contacter", l: "À contacter" },
  { v: "repondeur", l: "Répondeur" },
  { v: "barrage", l: "Barrage" },
  { v: "a_rappeler", l: "À rappeler" },
  { v: "chaud", l: "Chaud" },
  { v: "signe", l: "Signé" },
  { v: "non", l: "Non" },
  { v: "mauvais_prospect", l: "Mauvais prospect" },
];
const QUALIFS = [
  { v: "", l: "Qualif." },
  { v: "cherche", l: "Cherche des clients" },
  { v: "irregulier", l: "Irrégulier" },
  { v: "plein", l: "Plein" },
  { v: "pas_decideur", l: "Pas décideur" },
];
const STATUT_COLOR = {
  a_contacter: "#6f6a5c", repondeur: "#8a5a2e", barrage: "#8a5a2e",
  a_rappeler: "#2e6b8a", chaud: "#d64a2e", signe: "#1e7a4d", non: "#6f6a5c", mauvais_prospect: "#9a3b3b",
};
const REGIONS_PRIORITAIRES = ["Île-de-France", "Auvergne-Rhône-Alpes", "Provence-Alpes-Côte d'Azur"];
const fmt2 = (n) => Math.round(n).toLocaleString("fr-FR");
const TAB_LABELS_CLOSER = { accueil: "Accueil", prospects: "Mes prospects", documents: "Documents", script: "Scripts d'appel" };
const TAB_LABELS_ADMIN = { accueil: "Accueil", prospects: "Suivi équipe", documents: "Documents", script: "Scripts d'appel" };
const MOTIV_QUOTES = [
  "Le premier fournisseur qui appelle avec un « félicitations pour la reprise » part avec une longueur d'avance.",
  "Chaque appel qualifie une donnée : soit un client, soit une objection à raffiner. Aucun appel n'est perdu.",
  "10 deals/mois, c'est un bon side. Le vrai levier, c'est le premier compte enterprise que vous décrochez.",
  "Un client qui reste au mois 2 vous rapporte 37% de plus. Bien qualifier vaut mieux que bien vendre vite.",
  "La donnée est publique, votre rapidité ne l'est pas. Le repreneur choisit son fournisseur dans les 90 premiers jours.",
];

const BADGE_ICON = {
  trophy: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a2 2 0 0 0 0 4h3M17 6h3a2 2 0 0 1 0 4h-3"/></svg>,
  flame: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c4 0 7-3 7-7 0-3-2-5-3-7-1 2-2 3-3 3 0-3-1-6-4-8 0 4-4 6-4 12 0 4 3 7 7 7z"/></svg>,
  rocket: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2M14 4l6 6-8 8-6-6zM9 15l-1 1M15 9l1-1"/><circle cx="15" cy="9" r="1.5"/></svg>,
  lock: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>,
};

const EMAILS = [
  {
    id: "premier_contact",
    label: "Premier contact (pas de réponse au téléphone)",
    desc: "Vous avez appelé le fournisseur (agenceur, équipementier, caisse, enseigne, boissons...) sans le joindre, et vous avez récupéré son email sur son site ou un annuaire. Remplacez les crochets, c'est tout.",
    objet: "[Nom de son entreprise] : les restaurants qui viennent d'être repris près de chez vous",
    corps: `Bonjour [Prénom],

J'ai essayé de vous joindre par téléphone ce matin, sans succès. Je vous écris donc en deux lignes.

Chaque jour, des restaurants, bars et hôtels changent de propriétaire dans votre zone. C'est publié au Journal officiel, et le nouveau propriétaire refait tout dans les 90 jours : agencement, matériel, caisse, enseigne, contrats. Le premier fournisseur qui l'appelle prend la place.

LeBonProspect vous envoie chaque matin à 8h la liste de ces reprises, avec le nom du repreneur, l'adresse de l'établissement et le numéro de téléphone.

Je vous ai préparé une page avec les chiffres réels de votre zone et les dernières reprises publiées : [lien de la page]

Vous avez 5 minutes cette semaine pour que je vous montre ? Dites-moi le créneau qui vous arrange et je vous rappelle.

Bonne journée,
[Prénom du closer]
LeBonProspect
[téléphone du closer]`,
  },
  {
    id: "follow_up",
    label: "Après un appel, sans décision",
    desc: "Vous l'avez eu au téléphone, il a écouté, il n'a pas tranché. Vous envoyez la page et la plaquette pour qu'il voie le produit, et vous fixez le prochain contact.",
    objet: "Suite à notre échange : la plaquette et votre page LeBonProspect",
    corps: `Bonjour [Prénom],

Merci pour votre temps au téléphone tout à l'heure.

Comme convenu, voici de quoi voir concrètement ce que vous recevriez chaque matin :

1. Votre page, avec les chiffres réels de votre zone et les dernières reprises publiées : [lien de la page]
2. La plaquette, avec un exemple de l'email tel qu'il arrive à 8h dans la boîte mail : [lien de la plaquette]

Pour résumer ce qu'on s'est dit : un repreneur choisit ses fournisseurs dans les 90 jours qui suivent la reprise. Avec LeBonProspect, vous l'appelez le lendemain de la publication, avant vos concurrents. Un seul client signé dans l'année rembourse l'abonnement.

C'est sans engagement, résiliable en un clic. Vous pouvez tester un mois, appeler quelques repreneurs et juger sur pièce.

Je vous rappelle [jour] à [heure] comme convenu. Si ce créneau ne vous va plus, dites-le-moi et on en trouve un autre.

Bonne journée,
[Prénom du closer]
LeBonProspect
[téléphone du closer]`,
  },
  {
    id: "relance",
    label: "Relance sans réponse",
    desc: "5 à 7 jours après l'email précédent, toujours rien. Un email court, sans pression, qui remet le sujet en haut de la pile et propose une sortie facile.",
    objet: "Re : Suite à notre échange : la plaquette et votre page LeBonProspect",
    corps: `Bonjour [Prénom],

Je reviens vers vous après notre échange de la semaine dernière. Vous avez sans doute été pris, je ne vous en tiens pas rigueur.

Pour que ce soit simple, je vous remets le lien de votre page, avec les reprises de votre zone mises à jour : [lien de la page]

Deux options, selon ce qui vous arrange :
1. On se cale 5 minutes au téléphone cette semaine et je réponds à vos questions.
2. Vous testez directement un mois, sans engagement, et vous jugez sur les premières reprises reçues.

Si ce n'est pas le bon moment, dites-le-moi simplement, je vous laisse tranquille et je reste disponible quand le besoin se présentera.

Bonne journée,
[Prénom du closer]
LeBonProspect
[téléphone du closer]`,
  },
];

const SCRIPTS = SCRIPTS_V2;

export default function AppPage() {
  return (
    <ToastProvider>
      <AppPageInner />
    </ToastProvider>
  );
}

function AppPageInner() {
  const toast = useToast();
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("accueil");
  const [rows, setRows] = useState([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [refilling, setRefilling] = useState(false);
  const [refillMsg, setRefillMsg] = useState("");
  const [filterStatut, setFilterStatut] = useState("tous");
  const [filterCloser, setFilterCloser] = useState("tous");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [scriptId, setScriptId] = useState("evenement");
  const [emailOpenId, setEmailOpenId] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [celebrating, setCelebrating] = useState(null); // { societe } | null
  const [signingId, setSigningId] = useState(null);
  const [generatingId, setGeneratingId] = useState(null);
  const [motivIdx] = useState(() => Math.floor(Math.random() * MOTIV_QUOTES.length));
  const [adminStats, setAdminStats] = useState(null);
  const [loadingAdminStats, setLoadingAdminStats] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [closersList, setClosersList] = useState([]);
  const [poolRegions, setPoolRegions] = useState([]);
  const [essais, setEssais] = useState(null);

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
  const loadPoolRegions = useCallback(() => {
    if (!session) return;
    authedFetch("/api/pool-regions").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setPoolRegions(d); }).catch(() => {});
  }, [session]);
  useEffect(() => { loadPoolRegions(); }, [loadPoolRegions, rows.length]);
  useEffect(() => {
    if (!session || !profile || !(profile.role === "admin" || profile.essai_autorise)) return;
    authedFetch("/api/essais").then((r) => r.json()).then((d) => { if (d && d.stats) setEssais(d); }).catch(() => {});
  }, [session, profile, authedFetch]);

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

  const signDeal = async (prospect, planValue) => {
    const essai = planValue.endsWith("_essai");
    const plan = essai ? planValue.replace("_essai", "") : planValue;
    if (!plan) return;
    setSigningId(prospect.id);
    const res = await authedFetch("/api/sign-deal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prospect_id: prospect.id, plan, essai }),
    });
    setSigningId(null);
    if (res.ok) {
      const montant = plan === "departemental" ? 149 : plan === "regional" ? 299 : 0;
      setRows((prev) => prev.map((r) => (r.id === prospect.id ? { ...r, statut: "signe", plan, montant } : r)));
      setCelebrating({ societe: prospect.societe });
      setTimeout(() => setCelebrating(null), 3200);
    }
  };

  const generatePage = async (prospect) => {
    setGeneratingId(prospect.id);
    const res = await authedFetch("/api/generate-page", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prospect_id: prospect.id }),
    });
    const data = await res.json();
    setGeneratingId(null);
    if (res.ok) {
      setRows((prev) => prev.map((r) => (r.id === prospect.id ? { ...r, lien_teaser: data.url } : r)));
      toast("Page générée avec succès.", "success");
    } else {
      toast(data.error || "Erreur lors de la génération.", "error");
    }
  };

  const loadAdminStats = useCallback(() => {
    if (!session) return;
    setLoadingAdminStats(true);
    authedFetch("/api/admin-stats")
      .then((r) => r.json())
      .then((d) => { setAdminStats(d); setLoadingAdminStats(false); })
      .catch(() => setLoadingAdminStats(false));
  }, [session, authedFetch]);

  useEffect(() => { if (profile?.role === "admin" && tab === "accueil") loadAdminStats(); }, [profile, tab, loadAdminStats]);
  useEffect(() => {
    if (profile?.role === "admin" && session) {
      authedFetch("/api/closers-list").then((r) => r.json()).then((d) => setClosersList(Array.isArray(d) ? d : []));
    }
  }, [profile, session, authedFetch]);

  const exportCsv = async () => {
    setExportingCsv(true);
    try {
      const res = await authedFetch("/api/export-commissions");
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `commissions_${new Date().toISOString().slice(0, 7)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast("Export téléchargé.", "success");
    } catch {
      toast("Erreur lors de l'export.", "error");
    }
    setExportingCsv(false);
  };

  const logout = async () => { await supabase.auth.signOut(); window.location.href = "/closers/login"; };

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${label} copié.`, "success");
    } catch {
      toast("Impossible de copier — sélectionnez le texte manuellement.", "error");
    }
  };

  if (session === undefined || (session && !profile)) return <div className="app-loading">Chargement…</div>;
  if (session === null) return null;

  const filteredRows = rows
    .filter((r) => {
      if (filterStatut !== "tous" && r.statut !== filterStatut) return false;
      if (profile?.role === "admin" && filterCloser !== "tous" && r.closer_id !== filterCloser) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hay = `${r.societe || ""} ${r.categorie || ""} ${r.ville || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "recent") return new Date(b.claimed_at || b.created_at || 0) - new Date(a.claimed_at || a.created_at || 0);
      if (sortBy === "societe") return (a.societe || "").localeCompare(b.societe || "");
      if (sortBy === "statut") return (a.statut || "").localeCompare(b.statut || "");
      return 0;
    });

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

  // --- Relances du jour (aujourd'hui ou en retard, statut pas encore signé/perdu) ---
  const todayStr = new Date().toISOString().slice(0, 10);
  const relancesDues = rows
    .filter((r) => r.prochaine_action_date && r.prochaine_action_date <= todayStr && !["signe", "non"].includes(r.statut))
    .sort((a, b) => (a.prochaine_action_date < b.prochaine_action_date ? -1 : 1));

  // --- Badges de milestone (premier deal, 5 cumulés, 10 cumulés) ---
  const MILESTONES = [
    { n: 1, label: "Premier deal", icon: "trophy" },
    { n: 5, label: "5 deals cumulés", icon: "flame" },
    { n: 10, label: "10 deals cumulés", icon: "rocket" },
  ];
  const badgesObtenus = MILESTONES.filter((m) => nSigned >= m.n);
  const prochainBadge = MILESTONES.find((m) => nSigned < m.n) || null;
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
  const paliers = [5, 7, 10];
  const bonusParPalier = 75;
  const paliersAtteints = paliers.filter((p) => nSigned >= p).length;
  const bonusActuel = paliersAtteints * bonusParPalier;
  const prochainPalier = paliers.find((p) => nSigned < p) ?? null;
  const dealsRestants = prochainPalier ? prochainPalier - nSigned : 0;
  const progressPct = Math.min(100, (nSigned / 10) * 100);

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
            {Object.entries(profile?.role === "admin" ? TAB_LABELS_ADMIN : TAB_LABELS_CLOSER).map(([key, label]) => (
              <button
                key={key}
                className={tab === key ? "active" : ""}
                onClick={() => { setTab(key); setMobileMenuOpen(false); }}
              >
                {label}
              </button>
            ))}
            <a className="app-nav-link" href="https://mail.zoho.eu" target="_blank" rel="noreferrer">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-10 5L2 7" />
              </svg>
              Email pro
            </a>
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
          <button className={tab === "prospects" ? "active" : ""} onClick={() => setTab("prospects")}>{profile?.role === "admin" ? "Suivi équipe" : "Mes prospects"}</button>
          <button className={tab === "documents" ? "active" : ""} onClick={() => setTab("documents")}>Documents</button>
          <button className={tab === "script" ? "active" : ""} onClick={() => setTab("script")}>Scripts d&apos;appel</button>
          <a className="app-nav-link" href="https://mail.zoho.eu" target="_blank" rel="noreferrer">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-10 5L2 7" />
            </svg>
            Email pro
          </a>
        </nav>
        <div className="app-side-foot">
          <div className="app-who"><b>{profile?.full_name}</b><span>{profile?.role === "admin" ? "Admin" : "Closer"}</span></div>
          <button className="app-logout" onClick={logout}>Se déconnecter</button>
        </div>
      </aside>

      <section className="app-main">
        {tab === "accueil" && (
          <div className="app-panel narrow">
            <h1 className="app-h1">Bonjour {profile?.full_name?.split(" ")[0]}</h1>
            <p className="app-lead">Voici où vous en êtes.</p>

            {profile?.role !== "admin" && relancesDues.length > 0 && (
              <div className="today-panel">
                <div className="today-panel-head">
                  <span className="today-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></span>
                  <b>{relancesDues.length} relance{relancesDues.length > 1 ? "s" : ""} prévue{relancesDues.length > 1 ? "s" : ""} aujourd&apos;hui ou en retard</b>
                </div>
                <div className="today-list">
                  {relancesDues.slice(0, 5).map((r) => (
                    <div key={r.id} className="today-item">
                      <div className="today-item-info">
                        <b>{r.societe}</b>
                        <span>{r.prochaine_action || "Relance prévue"} — {r.prochaine_action_date === todayStr ? "aujourd'hui" : `depuis le ${new Date(r.prochaine_action_date).toLocaleDateString("fr-FR")}`}</span>
                      </div>
                      {r.telephone && <a href={`tel:${r.telephone.replace(/\s/g, "")}`} className="today-call-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7A2 2 0 0 1 22 16.9z"/></svg> Appeler</a>}
                    </div>
                  ))}
                </div>
                {relancesDues.length > 5 && (
                  <p className="today-more">+ {relancesDues.length - 5} autre{relancesDues.length - 5 > 1 ? "s" : ""} dans l&apos;onglet Mes prospects</p>
                )}
              </div>
            )}

            <div className="motiv-banner">
              <span className="emoji"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/></svg></span>
              <span>{MOTIV_QUOTES[motivIdx]}</span>
            </div>

            <div className="dash-stats" style={{ marginTop: 20 }}>
              <div className="dash-stat"><div className="n">{stats.total}</div><div className="l">prospects assignés</div></div>
              <div className="dash-stat"><div className="n">{stats.aTraiter}</div><div className="l">à contacter</div></div>
              <div className="dash-stat hot"><div className="n">{stats.chaud}</div><div className="l">chauds</div></div>
              <div className="dash-stat ok"><div className="n">{stats.signe}</div><div className="l">signés</div></div>
            </div>

            {profile?.role !== "admin" && (
              <div className="badges-row">
                {MILESTONES.map((m) => {
                  const obtenu = nSigned >= m.n;
                  return (
                    <div key={m.n} className={`badge-milestone ${obtenu ? "obtenu" : "verrouille"}`}>
                      <span className="badge-emoji">{obtenu ? BADGE_ICON[m.icon] : BADGE_ICON.lock}</span>
                      <span className="badge-label">{m.label}</span>
                    </div>
                  );
                })}
                {prochainBadge && (
                  <div className="badge-milestone-next">
                    Plus que <b>{prochainBadge.n - nSigned}</b> deal{prochainBadge.n - nSigned > 1 ? "s" : ""} pour « {prochainBadge.label} » {prochainBadge.emoji}
                  </div>
                )}
              </div>
            )}
            {profile?.role === "admin" && (
              <div className="admin-panel">
                <div className="admin-panel-head">
                  <span className="perf-section-title" style={{ marginBottom: 0 }}>Vue équipe — ce mois-ci</span>
                  <button className="btn inv" onClick={exportCsv} disabled={exportingCsv} style={{ padding: "9px 16px", fontSize: 12.5 }}>
                    {exportingCsv ? "…" : "⤓ Export CSV commissions"}
                  </button>
                </div>

                {loadingAdminStats ? (
                  <p style={{ padding: "20px 0", color: "#6f6a5c" }}>Chargement…</p>
                ) : adminStats ? (
                  <>
                    <div className="dash-stats" style={{ marginTop: 14 }}>
                      <div className="dash-stat ok"><div className="n">{adminStats.global.signed_this_month}</div><div className="l">deals signés ce mois (équipe)</div></div>
                      <div className="dash-stat"><div className="n">{fmt2(adminStats.global.total_du)} €</div><div className="l">total dû ce mois (commissions + paliers)</div></div>
                      <div className="dash-stat"><div className="n">{adminStats.global.unclaimed_prospects}</div><div className="l">prospects encore dans le pool</div></div>
                      <div className="dash-stat"><div className="n" style={{ color: "#9a3b3b" }}>{adminStats.global.mauvais_prospects || 0}</div><div className="l">signalés « mauvais prospect »</div></div>
                    </div>

                    <div className="admin-closer-list">
                      {adminStats.closers.map((c) => (
                        <div key={c.id} className="admin-closer-row">
                          <div className="admin-closer-name">
                            <b>{c.full_name}</b>
                            <span>{c.email}</span>
                          </div>
                          <div className="admin-closer-stats">
                            <div><span className="n">{c.signed_this_month}</span><span className="l">signés ce mois</span></div>
                            <div><span className="n">{c.total_prospects}</span><span className="l">assignés</span></div>
                            {c.exclu_commissions ? <div><span className="n" style={{ color: "#6f6a5c", fontSize: 13 }}>fondatrice</span><span className="l">hors commissions</span></div> : <div><span className="n hot">{fmt2(c.total_du)} €</span><span className="l">dû ce mois</span></div>}
                          </div>
                        </div>
                      ))}
                      {adminStats.closers.length === 0 && <p style={{ color: "#6f6a5c", fontSize: 13 }}>Aucun closer inscrit pour le moment.</p>}
                    </div>
                  </>
                ) : null}
              </div>
            )}

            {essais && (profile?.role === "admin" || profile?.essai_autorise) && (
              <div className="app-card essai-panel">
                <h3>Essais gratuits 7 jours</h3>
                <p style={{ fontSize: 13, color: "#6f6a5c", marginTop: 4 }}>Alimenté automatiquement par Stripe. Un essai est « converti » au premier paiement encaissé, « résilié » s&apos;il est annulé avant.</p>
                <div className="essai-kpis">
                  <div className="essai-kpi"><div className="n">{essais.stats.total}</div><div className="l">essais démarrés</div></div>
                  <div className="essai-kpi"><div className="n">{essais.stats.en_cours}</div><div className="l">en cours</div></div>
                  <div className="essai-kpi"><div className="n" style={{ color: "#1e7a4d" }}>{essais.stats.convertis}</div><div className="l">convertis (1er paiement)</div></div>
                  <div className="essai-kpi"><div className="n" style={{ color: "#9a3b3b" }}>{essais.stats.resilies}</div><div className="l">résiliés avant paiement</div></div>
                </div>
                {essais.stats.taux_conversion !== null && <p style={{ fontWeight: 700 }}>Taux de conversion essai → payant : {essais.stats.taux_conversion} %</p>}
                {essais.rows.length === 0 && <p style={{ color: "#6f6a5c", fontSize: 13 }}>Aucun essai démarré pour le moment.</p>}
                {essais.rows.map((r) => (
                  <div className="essai-row" key={r.email}>
                    <div><b>{r.societe || r.nom || r.email}</b><br /><span style={{ fontSize: 12, color: "#6f6a5c" }}>{r.email} · {r.plan} · {r.zone || "zone non reconnue"}{r.essai_fin ? ` · fin d'essai le ${new Date(r.essai_fin).toLocaleDateString("fr-FR")}` : ""}</span></div>
                    <span className={`st${r.etat === "converti" ? " conv" : r.etat === "resilie" ? " perdu" : ""}`}>
                      {r.etat === "converti" ? "converti" : r.etat === "resilie" ? "résilié" : r.etat === "fin_essai_attente" ? "fin d'essai, paiement en attente" : "en cours"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {profile?.role !== "admin" && (
              <>
                {/* Commission estimée + paliers (masqué pour un fondateur qui close) */}
                {!profile?.exclu_commissions && (
                <>
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
                        <span style={{ left: "50%" }}>5 → +75€</span>
                        <span style={{ left: "70%" }}>7 → +75€</span>
                        <span style={{ left: "100%" }}>10 → +75€</span>
                      </div>
                    </div>
                    <div className="perf-sub" style={{ marginTop: 22 }}>
                      {prochainPalier
                        ? <>Plus que <b>{dealsRestants}</b> deal{dealsRestants > 1 ? "s" : ""} avant le prochain palier (+75€)</>
                        : <>Tous les paliers sont atteints ce mois-ci</>}
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
                </>
                )}

                <div className="app-card dark" style={{ marginTop: 20 }}>
                  <h3 style={{ color: "#fff" }}>Recevoir de nouveaux leads</h3>
                  <p style={{ marginBottom: 14 }}>Piochez de nouveaux prospects CHR dans le vivier, non assignés à un autre closer. Par lot de 15.</p>
                  <div className="app-refill-row">
                    <button className="btn" onClick={() => doRefill(null)} disabled={refilling}>{refilling ? "..." : "+ 15 nouveaux leads (toutes zones)"}</button>
                    {[...poolRegions]
                      .sort((a, b) => {
                        const pa = REGIONS_PRIORITAIRES.indexOf(a.region), pb = REGIONS_PRIORITAIRES.indexOf(b.region);
                        if (pa !== -1 || pb !== -1) return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
                        return b.n - a.n;
                      })
                      .filter((r) => r.n > 0)
                      .map((r) => (
                        <button key={r.region} className="btn" onClick={() => doRefill(r.region)} disabled={refilling}>
                          {refilling ? "..." : `+ ${r.region}`}<span className="refill-count">{r.n}</span>
                        </button>
                      ))}
                  </div>
                  {refillMsg && <p style={{ marginTop: 12, color: "#a9d2d3", fontWeight: 700 }}>{refillMsg}</p>}
                </div>
              </>
            )}

            <div className="app-card teal" style={{ marginTop: 20 }}>
              <p>Besoin d&apos;un script d&apos;appel ou de la plaquette ? Tout est dans les onglets <b>Documents</b> et <b>Scripts d&apos;appel</b>.</p>
            </div>
          </div>
        )}

        {tab === "prospects" && (
          <div className="app-panel">
            <h1 className="app-h1">{profile?.role === "admin" ? "Suivi équipe" : "Mes prospects"}</h1>
            {profile?.role === "admin" && (
              <p className="app-lead" style={{ marginTop: -4, marginBottom: 12 }}>
                Vue de supervision en lecture. Filtrez par closer pour voir où en est chacun — vous ne pouvez pas réclamer de prospects vous-même.
              </p>
            )}
            <div className="dash-filters" style={{ marginTop: 16 }}>
              <input
                type="text"
                className="dash-search"
                placeholder="Rechercher une société, une ville…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}>
                <option value="tous">Tous les statuts</option>
                {STATUTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="recent">Plus récents</option>
                <option value="societe">Société (A-Z)</option>
                <option value="statut">Statut</option>
              </select>
              {profile?.role === "admin" && (
                <select value={filterCloser} onChange={(e) => setFilterCloser(e.target.value)}>
                  <option value="tous">Tous les closers</option>
                  {closersList.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              )}
              <button className="btn inv" onClick={loadRows} style={{ padding: "9px 16px", fontSize: 13 }}>↻ Rafraîchir</button>
            </div>
            {(searchQuery || filterStatut !== "tous") && (
              <p className="dash-result-count">{filteredRows.length} prospect{filteredRows.length > 1 ? "s" : ""} trouvé{filteredRows.length > 1 ? "s" : ""}</p>
            )}

            {loadingRows ? (
              <p style={{ padding: "30px 0", color: "#6f6a5c" }}>Chargement…</p>
            ) : (
              <>
                {/* Desktop : vrai tableau */}
                <div className="dash-table-wrap dash-desktop-only" style={{ marginTop: 16 }}>
                  <table className="dash-table">
                    <thead>
                      <tr><th>Société</th><th>Zone</th><th>Tél.</th><th>Page</th><th>Statut</th><th>Plan</th><th>Prochaine action</th><th>Notes</th></tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((r) => (
                        <tr key={r.id}>
                          <td><b>{r.societe}</b><div className="dash-sub">{r.categorie}</div>{r.outreach_lead && (
                              <div className="outreach-tag" title={`Email « un lead gratuit » envoyé le ${new Date(r.outreach_sent_at).toLocaleDateString("fr-FR")}`}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
                                A reçu {r.outreach_lead.commercant} ({r.outreach_lead.ville}) le {new Date(r.outreach_sent_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                              </div>
                            )}</td>
                          <td className="dash-sub">{r.region}<br />{r.ville}</td>
                          <td>{r.telephone && <a href={`tel:${r.telephone.replace(/\s/g, "")}`} className="mono">{r.telephone}</a>}</td>
                          <td>
                            {r.lien_teaser ? (
                              <a href={r.lien_teaser} target="_blank" rel="noreferrer" className="dash-link">voir →</a>
                            ) : profile?.role === "admin" ? (
                              <span className="dash-sub">—</span>
                            ) : (
                              <button className="page-gen-btn" onClick={() => generatePage(r)} disabled={generatingId === r.id}>
                                {generatingId === r.id ? "…" : "Générer"}
                              </button>
                            )}
                          </td>
                          <td>
                            <select value={r.statut || "a_contacter"} onChange={(e) => patch(r.id, { statut: e.target.value })} disabled={profile?.role === "admin"} style={{ color: STATUT_COLOR[r.statut] || "#14181d", fontWeight: 700 }}>
                              {STATUTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
                            </select>
                            <select className="qualif-select" value={r.qualification || ""} onChange={(e) => patch(r.id, { qualification: e.target.value || null })} disabled={profile?.role === "admin"} title="Réponse à la question de qualification">
                              {QUALIFS.map((q) => <option key={q.v} value={q.v}>{q.l}</option>)}
                            </select>
                          </td>
                          <td>
                            {r.statut === "signe" ? (
                              <select
                                value={r.plan ? (r.essai ? r.plan + "_essai" : r.plan) : ""}
                                onChange={(e) => signDeal(r, e.target.value)}
                                disabled={signingId === r.id || profile?.role === "admin"}
                                style={{ fontWeight: 700 }}
                              >
                                <option value="">— choisir —</option>
                                <option value="departemental">Départemental (149€)</option>
                                <option value="regional">Régional (299€)</option>
                                <option value="national">National (sur devis)</option>
                                {profile?.essai_autorise && <option value="departemental_essai">Essai 7 j · Départemental</option>}
                                {profile?.essai_autorise && <option value="regional_essai">Essai 7 j · Régional</option>}
                              </select>
                            ) : (
                              <span className="dash-sub">—</span>
                            )}
                          </td>
                          <td>
                            <input
                              className="dash-input"
                              type="date"
                              defaultValue={r.prochaine_action_date || ""}
                              onChange={(e) => patch(r.id, { prochaine_action_date: e.target.value || null })}
                              disabled={profile?.role === "admin"}
                              style={{ marginBottom: 4, fontSize: 11 }}
                            />
                            <input className="dash-input" defaultValue={r.prochaine_action || ""} placeholder="ex: rappel + objection" disabled={profile?.role === "admin"} onBlur={(e) => e.target.value !== r.prochaine_action && patch(r.id, { prochaine_action: e.target.value })} />
                          </td>
                          <td><input className="dash-input wide" defaultValue={r.notes || ""} placeholder="objections…" disabled={profile?.role === "admin"} onBlur={(e) => e.target.value !== r.notes && patch(r.id, { notes: e.target.value })} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredRows.length === 0 && (
                    <p style={{ padding: "30px 0", textAlign: "center", color: "#6f6a5c" }}>
                      {profile?.role === "admin" ? "Aucun prospect ne correspond à ce filtre." : "Aucun prospect pour le moment. Allez sur Accueil pour en récupérer."}
                    </p>
                  )}
                </div>

                {/* Mobile : cartes empilées */}
                <div className="prospect-cards dash-mobile-only">
                  {filteredRows.map((r) => (
                    <div key={r.id} className="prospect-card">
                      <div className="prospect-card-head">
                        <div>
                          <b>{r.societe}</b>
                          <div className="dash-sub">{r.categorie} · {r.region}{r.ville ? ` · ${r.ville}` : ""}</div>
                          {r.outreach_lead && (
                            <div className="outreach-tag">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
                              A reçu {r.outreach_lead.commercant} ({r.outreach_lead.ville}) le {new Date(r.outreach_sent_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                            </div>
                          )}
                        </div>
                        {r.lien_teaser ? (
                          <a href={r.lien_teaser} target="_blank" rel="noreferrer" className="dash-link">voir →</a>
                        ) : profile?.role === "admin" ? (
                          <span className="dash-sub">—</span>
                        ) : (
                          <button className="page-gen-btn" onClick={() => generatePage(r)} disabled={generatingId === r.id}>
                            {generatingId === r.id ? "…" : "Générer"}
                          </button>
                        )}
                      </div>
                      {r.telephone && (
                        <a href={`tel:${r.telephone.replace(/\s/g, "")}`} className="prospect-card-tel mono"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7A2 2 0 0 1 22 16.9z"/></svg> {r.telephone}</a>
                      )}
                      <div className="prospect-card-row">
                        <label>Statut</label>
                        <select value={r.statut || "a_contacter"} onChange={(e) => patch(r.id, { statut: e.target.value })} disabled={profile?.role === "admin"} style={{ color: STATUT_COLOR[r.statut] || "#14181d", fontWeight: 700 }}>
                          {STATUTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
                        </select>
                      </div>
                      <div className="prospect-card-row">
                        <label>Qualif.</label>
                        <select value={r.qualification || ""} onChange={(e) => patch(r.id, { qualification: e.target.value || null })} disabled={profile?.role === "admin"}>
                          {QUALIFS.map((q) => <option key={q.v} value={q.v}>{q.l}</option>)}
                        </select>
                      </div>
                      {r.statut === "signe" && (
                        <div className="prospect-card-row">
                          <label>Plan</label>
                          <select
                            value={r.plan ? (r.essai ? r.plan + "_essai" : r.plan) : ""}
                            onChange={(e) => signDeal(r, e.target.value)}
                            disabled={signingId === r.id || profile?.role === "admin"}
                            style={{ fontWeight: 700 }}
                          >
                            <option value="">— choisir —</option>
                            <option value="departemental">Départemental (149€)</option>
                            <option value="regional">Régional (299€)</option>
                            <option value="national">National (sur devis)</option>
                            {profile?.essai_autorise && <option value="departemental_essai">Essai 7 j · Départemental</option>}
                            {profile?.essai_autorise && <option value="regional_essai">Essai 7 j · Régional</option>}
                          </select>
                        </div>
                      )}
                      <div className="prospect-card-row">
                        <label>Date de relance</label>
                        <input
                          className="dash-input"
                          type="date"
                          defaultValue={r.prochaine_action_date || ""}
                          onChange={(e) => patch(r.id, { prochaine_action_date: e.target.value || null })}
                          disabled={profile?.role === "admin"}
                        />
                      </div>
                      <div className="prospect-card-row">
                        <label>Prochaine action</label>
                        <input className="dash-input" defaultValue={r.prochaine_action || ""} placeholder="ex: rappel + objection" disabled={profile?.role === "admin"} onBlur={(e) => e.target.value !== r.prochaine_action && patch(r.id, { prochaine_action: e.target.value })} />
                      </div>
                      <div className="prospect-card-row">
                        <label>Notes</label>
                        <input className="dash-input" defaultValue={r.notes || ""} placeholder="objections…" disabled={profile?.role === "admin"} onBlur={(e) => e.target.value !== r.notes && patch(r.id, { notes: e.target.value })} />
                      </div>
                    </div>
                  ))}
                  {filteredRows.length === 0 && (
                    <p style={{ padding: "30px 0", textAlign: "center", color: "#6f6a5c" }}>
                      {profile?.role === "admin" ? "Aucun prospect ne correspond à ce filtre." : "Aucun prospect pour le moment. Allez sur Accueil pour en récupérer."}
                    </p>
                  )}
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
              <a className="app-doc" href="/closers/kit" target="_blank" rel="noreferrer">
                <b>Kit de démarrage complet →</b>
                <span>Produit, rémunération, do&apos;s &amp; don&apos;ts, processus</span>
              </a>
              {profile?.essai_autorise && (
                <div className="app-doc app-doc-essai">
                  <div className="app-doc-plaquette-txt">
                    <b>Liens de paiement « Essai gratuit 7 jours »</b>
                    <p style={{ margin: "6px 0 0", fontSize: 13, color: "#55524a" }}>
                      Réservés à votre compte. Le client renseigne sa carte et sa zone, n&apos;est pas débité pendant 7 jours, puis passe au tarif normal. S&apos;il résilie avant, aucun débit. Il reçoit son premier digest dès le lendemain 8h.
                    </p>
                    <div className="essai-links">
                      <button type="button" className="page-gen-btn" onClick={() => copyToClipboard("https://buy.stripe.com/8x26oHffzaSEc9faPL8N203", "Lien essai Départemental")}>Copier · Départemental 149 €</button>
                      <button type="button" className="page-gen-btn" onClick={() => copyToClipboard("https://buy.stripe.com/00w7sLc3nbWI7SZcXT8N204", "Lien essai Régional")}>Copier · Régional 299 €</button>
                    </div>
                  </div>
                </div>
              )}
              <div className="app-doc app-doc-plaquette">
                <a
                  className="app-doc-plaquette-txt"
                  href="/documents/LeBonProspect_Plaquette_Digest.pdf"
                  target="_blank"
                  rel="noreferrer"
                >
                  <b>Plaquette « Le digest, tel qu&apos;il arrive » →</b>
                  <span>Capture réelle de l&apos;email envoyé chaque matin — à montrer ou envoyer après un appel</span>
                </a>
                <a className="page-gen-btn" href="/documents/LeBonProspect_Plaquette_Digest.pdf" download>
                  Télécharger le PDF
                </a>
              </div>
              <div className="app-doc" onClick={() => setTab("script")}>
                <b>Scripts d&apos;appel →</b>
                <span>4 approches différentes, objections, closing</span>
              </div>
            </div>

            <h2 className="disp" style={{ fontSize: 19, marginTop: 32, marginBottom: 6 }}>Emails types</h2>
            <p className="app-lead" style={{ marginBottom: 16 }}>À copier-coller et personnaliser selon la situation du prospect.</p>

            <div className="email-templates">
              {EMAILS.map((e) => {
                const open = emailOpenId === e.id;
                return (
                  <div key={e.id} className="email-card">
                    <button className="email-card-head" onClick={() => setEmailOpenId(open ? null : e.id)}>
                      <div>
                        <b>{e.label}</b>
                        <span>{e.desc}</span>
                      </div>
                      <span className="email-chevron">{open ? "−" : "+"}</span>
                    </button>
                    {open && (
                      <div className="email-card-body">
                        <div className="email-field">
                          <div className="email-field-head">
                            <label>Objet</label>
                            <button className="page-gen-btn" onClick={() => copyToClipboard(e.objet, "Objet")}>Copier</button>
                          </div>
                          <div className="email-preview email-preview-objet">{e.objet}</div>
                        </div>
                        <div className="email-field">
                          <div className="email-field-head">
                            <label>Corps du message</label>
                            <button className="page-gen-btn" onClick={() => copyToClipboard(e.corps, "Message")}>Copier</button>
                          </div>
                          <pre className="email-preview">{e.corps}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "script" && (
          <div className="app-panel narrow">
            <h1 className="app-h1">Scripts d&apos;appel</h1>
            <p className="app-lead" style={{ marginBottom: 16 }}>Trames v2, dans l'ordre d'un appel : on qualifie avant de pitcher, on vend des chantiers signés plutôt qu'une liste, et on sort de chaque appel avec un lien envoyé et une date de rappel.</p>

            <div className="script-tabs">
              {SCRIPTS.map((s) => (
                <button key={s.id} className={`script-tab ${scriptId === s.id ? "active" : ""}`} onClick={() => setScriptId(s.id)}>
                  {s.label}
                </button>
              ))}
            </div>

            <p className="script-note">{activeScript.desc}</p>

            <div className="script-block">
              {activeScript.blocks.filter((b) => !(b.essaiOnly && !profile?.essai_autorise) && !(b.noEssai && profile?.essai_autorise)).map((b, i) => (
                <div key={i} className="script-sheet">
                  <div className="script-sheet-tab" style={{
                    background: b.style === "dark" ? "#14181d" : b.style === "teal" ? "#31777A" : "#d64a2e",
                  }}>
                    <span>{b.title}</span>
                    {b.text && (
                      <button
                        className="script-copy"
                        onClick={() => navigator.clipboard?.writeText(b.text)}
                        title="Copier ce texte"
                      >
                        Copier
                      </button>
                    )}
                  </div>
                  <div className="script-sheet-body">
                    {b.text && <p style={{ whiteSpace: "pre-line" }}>{b.text}</p>}
                    {b.list && (
                      <ul className="cl-list">
                        {b.list.map((l, j) => <li key={j}>{l}</li>)}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {celebrating && (
        <div className="celebrate-overlay">
          <div className="celebrate-card">
            <div className="celebrate-emoji">🎉</div>
            <div className="celebrate-title">Deal signé !</div>
            <div className="celebrate-sub">{celebrating.societe}</div>
            <div className="celebrate-note">Lawrenza vient d&apos;être notifiée.</div>
          </div>
          <div className="confetti">
            {Array.from({ length: 24 }).map((_, i) => (
              <span key={i} className="confetti-piece" style={{
                left: `${(i * 37) % 100}%`,
                animationDelay: `${(i % 8) * 0.12}s`,
                background: ["#31777A", "#d64a2e", "#14181d", "#f1ebd9"][i % 4],
              }} />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
