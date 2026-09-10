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
  const [openDoc, setOpenDoc] = useState(null); // "kit" | null
  const [scriptId, setScriptId] = useState("evenement");

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

  useEffect(() => { if (tab === "prospects") loadRows(); }, [tab, loadRows]);

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
              <div className="cl-card dark" style={{ marginTop: 24 }}>
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
              <div className="dash-table-wrap" style={{ marginTop: 16 }}>
                <table className="dash-table">
                  <thead>
                    <tr><th>Société</th><th>Zone</th><th>Tél.</th><th>Lien</th><th>Statut</th><th>Prochaine action</th><th>Notes</th></tr>
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
                        <td><input className="dash-input" defaultValue={r.prochaine_action || ""} placeholder="ex: rappel jeudi" onBlur={(e) => e.target.value !== r.prochaine_action && patch(r.id, { prochaine_action: e.target.value })} /></td>
                        <td><input className="dash-input wide" defaultValue={r.notes || ""} placeholder="objections…" onBlur={(e) => e.target.value !== r.notes && patch(r.id, { notes: e.target.value })} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredRows.length === 0 && <p style={{ padding: "30px 0", textAlign: "center", color: "#6f6a5c" }}>Aucun prospect pour le moment. Allez sur Accueil pour en récupérer.</p>}
              </div>
            )}
          </div>
        )}

        {tab === "documents" && (
          <div className="app-panel narrow">
            <h1 className="app-h1">Documents</h1>
            <p className="app-lead">Tout ce dont vous avez besoin, toujours à jour.</p>
            <div className="app-docs">
              <div className="app-doc" onClick={() => setOpenDoc(openDoc === "kit" ? null : "kit")}>
                <b>Kit de démarrage complet {openDoc === "kit" ? "▲" : "▼"}</b>
                <span>Produit, rémunération, do&apos;s &amp; don&apos;ts, processus</span>
              </div>
              {openDoc === "kit" && <KitContent />}

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

function KitContent() {
  return (
    <div className="cl-card" style={{ marginTop: -4 }}>
      <h3 className="cl-h3" style={{ marginTop: 0 }}>Le produit en 30 secondes</h3>
      <p>Chaque jour, des commerces changent de propriétaire en France, c&apos;est publié obligatoirement au Journal officiel. LeBonProspect détecte ces reprises et livre chaque matin à 8h, par email, le contact du repreneur (nom, adresse, téléphone quand disponible) aux fournisseurs qui veulent l&apos;approcher avant leurs concurrents.</p>

      <h3 className="cl-h3">Les formules vendues</h3>
      <ul className="cl-list">
        <li><b>Départemental</b> — 149 €/mois — 1 département</li>
        <li><b>Régional</b> — 299 €/mois — 1 région complète</li>
        <li><b>National / Enterprise</b> — Sur devis — France entière, multi-comptes</li>
      </ul>
      <p className="script-note">Sans engagement, résiliable en 1 clic. 6 mois = 1 mois offert. 12 mois = 2 mois offerts.</p>

      <h3 className="cl-h3">Rémunération</h3>
      <ul className="cl-list">
        <li>Sans engagement : 25% du 1er mois + 10% du 2e mois si le client reste actif</li>
        <li>30 premiers jours : bonus de lancement, 35% au lieu de 25%</li>
        <li>Engagement 6 mois : 100% du 1er mois, en 2×50% (signature + mi-engagement)</li>
        <li>Paliers volume : +50€ à 5 deals/mois, +150€ de plus à 10 deals/mois</li>
        <li>Virement instantané le jour de l&apos;encaissement client, facturation en indépendant obligatoire</li>
      </ul>

      <h3 className="cl-h3">À faire</h3>
      <ul className="cl-list">
        <li>Toujours citer une reprise réelle et récente, jamais un exemple inventé</li>
        <li>Envoyer le lien personnalisé en direct pendant l&apos;appel</li>
        <li>Rappeler que c&apos;est sans engagement, résiliable en un clic</li>
        <li>Reporter un deal signé le jour même à Lawrenza</li>
      </ul>

      <h3 className="cl-h3">À ne jamais faire</h3>
      <ul className="cl-list">
        <li>Inventer ou arrondir un chiffre, un numéro, une reprise</li>
        <li>Promettre un délai ferme sur une fonctionnalité non livrée</li>
        <li>Garantir un résultat commercial</li>
        <li>Dire « prospect qualifié » (les cibles ne sont pas pré-appelées, mais elles ne sortent pas de nulle part)</li>
        <li>Signer sans formulaire secteur + zone rempli</li>
      </ul>
    </div>
  );
}
