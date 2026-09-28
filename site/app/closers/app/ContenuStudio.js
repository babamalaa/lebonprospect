"use client";

import { useEffect, useMemo, useState, useCallback } from "react";

// Modèles : chaque modèle est une fonction (stats) -> { nom, slides[], legende, hashtags }
// Un slide = { kind, bg: ""|"dark"|"teal", eyebrow, title, hl, lead, big, items, stats, quote, cta, tag }
const fmt = (n) => (n == null ? "" : Number(n).toLocaleString("fr-FR"));
const HASHTAGS_IG = "#CHR #restauration #fournisseurCHR #agencement #enseigne #materielCHR #prospectionB2B #reprisedecommerce #BODACC #LeBonProspect";
const HASHTAGS_LI = "#CHR #prospectionB2B #restauration #reprisedecommerce #LeBonProspect";

const MODELES = [
  {
    id: "chiffre", nom: "Le chiffre choc (image unique)",
    build: (s) => ({
      slides: [{ bg: "", eyebrow: "Journal officiel · 12 derniers mois", big: fmt(s.total_12m), title: "commerces ont changé de propriétaire en France.", lead: `Soit ${fmt(s.par_mois)} par mois. Chacun est un nouveau patron qui rééquipe, renégocie et cherche ses fournisseurs. Combien vous en ont appelé ?`, tag: "Source : BODACC, cessions de fonds de commerce" }],
      legende: `${fmt(s.total_12m)} commerces ont changé de propriétaire en France sur les 12 derniers mois. Source : BODACC, cessions de fonds de commerce.\n\nC'est ${fmt(s.par_mois)} par mois. ${fmt(s.par_mois)} nouveaux patrons qui rééquipent, renégocient et choisissent leurs fournisseurs dans les 90 jours qui suivent.\n\nCombien vous en ont appelé ?\n\nNous les trions par métier et par zone, nous identifions le repreneur, et vous recevez la liste chaque matin à 8h. Lien en bio.`,
    }),
  },
  {
    id: "journee", nom: "Une journée au Journal officiel (carrousel)",
    build: (s) => ({
      slides: [
        { bg: "", eyebrow: `Édition du ${s.derniere_edition ? new Date(s.derniere_edition).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : ""}`, title: "Une journée ordinaire", hl: "au Journal officiel.", lead: "Ce que contenait l'édition du jour, une fois triée par métier. Rien d'inventé : tout est vérifiable au BODACC.", tag: "Une journée au Journal officiel" },
        { bg: "dark", eyebrow: "Cessions de fonds de commerce", big: fmt(s.jour_type_total), title: "commerces ont changé de propriétaire ce jour-là.", lead: `Dont ${fmt(s.jour_type_chr)} restaurants, bars et hôtels. Chacun a une enseigne à refaire, une cuisine à inspecter, des contrats à renégocier.`, tag: "Une journée au Journal officiel" },
        { bg: "teal", quote: `${s.pct_neufs_chr_90j} % de ces repreneurs ont créé leur société il y a moins de 90 jours. Ils viennent d'arriver. Leurs budgets sont ouverts. Ils n'ont encore dit oui à personne.`, tag: "Source : BODACC + registre des sociétés" },
        { bg: "", eyebrow: "LeBonProspect", title: `Ces ${fmt(s.jour_type_chr)}-là, nos abonnés les ont eus le lendemain à 8h.`, lead: "Avec le nom du repreneur, l'adresse et le téléphone de l'établissement. Vous, vous en avez appelé combien ?", cta: "Recevoir ceux de ma zone", tag: "Une journée au Journal officiel" },
      ],
      legende: `Une journée ordinaire au Journal officiel.\n\n${fmt(s.jour_type_total)} commerces ont changé de propriétaire ce jour-là. Dont ${fmt(s.jour_type_chr)} restaurants, bars et hôtels.\n\n${fmt(s.jour_type_chr)} restaurateurs qui, ce matin-là, avaient tout à acheter : une enseigne à refaire, une cuisine à inspecter, des contrats à renégocier. Et ${s.pct_neufs_chr_90j} % d'entre eux ont créé leur société il y a moins de 90 jours : ils viennent d'arriver, ils n'ont encore dit oui à personne.\n\nNos abonnés les ont eus le lendemain à 8h, avec le nom du repreneur et le téléphone de l'établissement. Vous, vous en avez appelé combien ?\n\nLien en bio.`,
    }),
  },
  {
    id: "budgets", nom: "Budgets ouverts (image unique)",
    build: (s) => ({
      slides: [{ bg: "dark", eyebrow: "Restaurants, bars et hôtels · 90 derniers jours", big: `${s.pct_neufs_chr_90j} %`, title: "des repreneurs ont créé leur société il y a moins de 90 jours.", lead: "Ce sont les nouveaux entrants. Pas encore de fournisseur attitré, un budget validé par la banque. Dans nos emails, ils portent un badge : budgets ouverts. C'est eux qu'on appelle en premier.", tag: `Source : BODACC + registre des sociétés, ${fmt(s.chr_90j)} reprises analysées` }],
      legende: `${s.pct_neufs_chr_90j} %. C'est la part des repreneurs de restaurants, bars et hôtels qui ont créé leur société il y a moins de 90 jours (${fmt(s.chr_90j)} reprises analysées sur les 90 derniers jours).\n\nCe sont les nouveaux entrants. Un budget validé par la banque, aucun fournisseur attitré, et une liste de choses à changer qui s'allonge chaque jour.\n\nDans nos emails, ils portent un badge : budgets ouverts. C'est eux qu'on appelle en premier.\n\nRecevoir les vôtres demain à 8h : lien en bio.`,
    }),
  },
  {
    id: "regions", nom: "Où ça se passe : régions (carrousel)",
    build: (s) => {
      const r = (s.regions_chr_90j || []).slice(0, 4);
      return {
        slides: [
          { bg: "", eyebrow: "Restaurants, bars et hôtels · 90 derniers jours", title: "Où les commerces changent de mains", hl: "en ce moment.", lead: "Les régions qui ont vu le plus de reprises CHR publiées au Journal officiel ces trois derniers mois.", tag: "Où ça se passe" },
          { bg: "teal", eyebrow: "Top régions · reprises CHR sur 90 jours", stats: r.map((x) => ({ n: fmt(x.n), l: x.region })), tag: "Source : BODACC, 90 derniers jours" },
          { bg: "dark", eyebrow: "Votre région, votre métier", title: "Les chiffres de chaque région, mis à jour chaque jour.", lead: "Restaurants, boulangeries, salons, garages : le nombre de reprises sur 12 mois, région par région, et les dernières publiées. En accès libre.", cta: "Voir ma région", tag: "lebonprospect.fr/reprises" },
        ],
        legende: `Où les commerces changent de mains en ce moment.\n\nSur les 90 derniers jours, pour les restaurants, bars et hôtels : ${r.map((x) => `${x.region} ${fmt(x.n)}`).join(", ")}.\n\nLe marché des reprises ne suit pas la taille des villes. Il suit les départs à la retraite, les cessions, les fins de bail. Et il se lit tous les matins au Journal officiel.\n\nLes chiffres de chaque région, métier par métier, mis à jour chaque jour : lebonprospect.fr/reprises (lien en bio).`,
      };
    },
  },
  {
    id: "villes", nom: "Où ça se passe : villes (carrousel)",
    build: (s) => {
      const v = (s.villes_chr_90j || []).slice(0, 4);
      return {
        slides: [
          { bg: "", eyebrow: "Restaurants, bars et hôtels · 90 derniers jours", title: "Les villes où ça bouge", hl: "en ce moment.", lead: "Le top des villes par nombre de reprises CHR publiées ces trois derniers mois.", tag: "Où ça se passe" },
          { bg: "dark", eyebrow: "Top villes · reprises CHR sur 90 jours", stats: v.map((x) => ({ n: fmt(x.n), l: x.ville })), tag: "Source : BODACC, 90 derniers jours" },
          { bg: "teal", eyebrow: "LeBonProspect", title: "Votre ville, votre métier, chaque matin à 8h.", lead: "Le commerce repris, le repreneur, l'adresse, le téléphone. Sans engagement.", cta: "Voir les reprises de ma zone", tag: "lebonprospect.fr" },
        ],
        legende: `Les villes où les commerces changent de mains en ce moment.\n\nSur 90 jours, pour les restaurants, bars et hôtels : ${v.map((x) => `${x.ville} ${fmt(x.n)}`).join(", ")}.\n\nChaque matin à 8h, nos abonnés reçoivent ceux de leur zone, avec le repreneur et le numéro. Lien en bio.`,
      };
    },
  },
  {
    id: "public", nom: "C'est public, je peux le faire moi-même (carrousel)",
    build: (s) => ({
      slides: [
        { bg: "", eyebrow: "L'objection qu'on entend tous les jours", title: "« C'est public, je peux le faire", hl: "moi-même. »", lead: "Vous avez raison. Voici ce que ça demande, tous les matins.", tag: "Public vs exploitable" },
        { bg: "dark", eyebrow: "Ce que le BODACC contient", title: "89 pages par jour. Tous secteurs. Toute la France.", items: [{ b: "Aucun tri par métier", s: "restaurants, garages et pharmacies mélangés" }, { b: "Aucun téléphone", s: "une raison sociale et une adresse, c'est tout" }, { b: "Aucun nom de dirigeant", s: "vous appelez qui ?" }, { b: "Aucun signal de fraîcheur", s: "repreneur installé, ou déjà en activité ?" }], tag: "Public vs exploitable" },
        { bg: "", eyebrow: "Ce que vous recevez à 8h", title: "3 reprises. Votre métier. Votre zone. Prêtes à appeler.", items: [{ b: "Le repreneur identifié", s: "nom, société, adresse de l'établissement" }, { b: "Le numéro de téléphone", s: `${s.pct_tel_chr_90j} % des fiches CHR livrées avec le numéro` }, { b: "Le badge « budgets ouverts »", s: "repreneur installé depuis moins de 90 jours" }], tag: "Public vs exploitable" },
        { bg: "teal", quote: "Public, oui. Exploitable, non. La question n'est pas l'accès. C'est qui les lit tous les matins à votre place.", tag: "Public vs exploitable" },
        { bg: "", eyebrow: "Le calcul", title: "Un client signé rembourse un an d'abonnement.", lead: "149 € par mois pour un département. Un chantier chez un agenceur, un équipementier ou un enseigniste vaut plus que ça.", cta: "Tester un mois, sans engagement", tag: "Public vs exploitable" },
      ],
      legende: `« C'est public, je peux le faire moi-même. »\n\nVous avez raison. Le BODACC est public, gratuit, et le restera. Voici ce qu'il contient : 89 pages par jour, tous secteurs et toute la France mélangés, sans téléphone, sans nom de dirigeant, sans savoir si le repreneur vient d'arriver ou s'il est déjà installé.\n\nCe que vous recevez à 8h : 3 reprises, votre métier, votre zone, le repreneur identifié, le numéro de l'établissement, et un badge qui dit si ses budgets sont encore ouverts.\n\nPublic, oui. Exploitable, non. La question n'est pas l'accès, c'est qui les lit tous les matins à votre place.\n\nUn client signé rembourse un an d'abonnement. Lien en bio.`,
    }),
  },
  {
    id: "stock", nom: "Le stock ou le signal (carrousel)",
    build: (s) => ({
      slides: [
        { bg: "", eyebrow: "Deux façons de faire", title: "Le stock, ou", hl: "le signal.", lead: "Vous avez peut-être déjà un fichier de tous les restaurants de votre zone. Ce n'est pas la même chose.", tag: "Stock vs signal" },
        { bg: "dark", eyebrow: "Le stock", title: "Tous les restaurants de la zone.", items: [{ b: "En permanence, sans changement" }, { b: "Impossible à appeler en entier" }, { b: "Ils ont déjà leurs fournisseurs" }, { b: "Vous arrivez après tout le monde" }], tag: "Stock vs signal" },
        { bg: "teal", eyebrow: "Le signal", title: "Ceux qui ont changé de propriétaire hier.", items: [{ b: "3 à 5 par jour, dans votre métier" }, { b: "Les seuls à appeler cette semaine" }, { b: "Aucun fournisseur attitré" }, { b: "Vous arrivez le premier" }], tag: "Stock vs signal" },
        { bg: "", eyebrow: "En chiffres", title: "Ce que le signal représente, chaque mois.", stats: [{ n: fmt(s.chr_30j), l: "reprises CHR sur 30 jours en France" }, { n: `${s.pct_tel_chr_90j} %`, l: "livrées avec le téléphone" }, { n: "24 h", l: "entre la publication et votre email" }, { n: "90 j", l: "de fenêtre d'achat après la reprise" }], tag: "Source : BODACC" },
      ],
      legende: `Vous avez peut-être déjà un fichier de tous les restaurants de votre zone. Gardez-le. Ce n'est pas la même chose.\n\nLe stock, c'est tous les restaurants de la zone, en permanence. Vos commerciaux l'ont déjà, et ils ne peuvent pas l'appeler en entier.\n\nLe signal, c'est lequel a changé de propriétaire hier. 3 à 5 par jour dans votre métier. Aucun fournisseur attitré. Vous arrivez le premier.\n\n${fmt(s.chr_30j)} reprises CHR sur 30 jours en France, ${s.pct_tel_chr_90j} % livrées avec le téléphone, 24 h entre la publication et votre email.\n\nDès 149 € par mois, sans engagement. Lien en bio.`,
    }),
  },
  {
    id: "libre", nom: "Modèle libre (à remplir)",
    build: () => ({
      slides: [{ bg: "", eyebrow: "", title: "Votre titre", hl: "", lead: "Votre texte.", tag: "Source : BODACC" }],
      legende: "",
    }),
  },
];

export default function ContenuStudio({ authedFetch, toast }) {
  const [stats, setStats] = useState(null);
  const [modele, setModele] = useState(MODELES[0].id);
  const [format, setFormat] = useState("ig");
  const [slides, setSlides] = useState([]);
  const [legende, setLegende] = useState("");
  const [sel, setSel] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    authedFetch("/api/contenu/data").then((r) => r.json()).then((d) => { if (d && !d.error) setStats(d); else toast?.("Chiffres indisponibles", "error"); }).catch(() => {});
  }, [authedFetch, toast]);

  const applyModele = useCallback((id, s) => {
    const m = MODELES.find((x) => x.id === id); if (!m || !s) return;
    const b = m.build(s);
    setSlides(b.slides); setLegende(b.legende ? b.legende + "\n\n" + (format === "li" ? HASHTAGS_LI : HASHTAGS_IG) : ""); setSel(0);
  }, [format]);

  useEffect(() => { if (stats) applyModele(modele, stats); }, [stats, modele, applyModele]);

  const urlFor = (s, i) => `/api/contenu/render?f=${format}&p=${i + 1}&n=${slides.length}&s=${encodeURIComponent(JSON.stringify(s))}`;
  const update = (k, v) => setSlides((arr) => arr.map((s, i) => (i === sel ? { ...s, [k]: v } : s)));
  const cur = slides[sel] || {};

  const downloadAll = async () => {
    setBusy(true);
    try {
      for (let i = 0; i < slides.length; i++) {
        const r = await fetch(urlFor(slides[i], i)); const blob = await r.blob();
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${modele}_${String(i + 1).padStart(2, "0")}.png`; a.click();
        await new Promise((res) => setTimeout(res, 400));
      }
      toast?.(`${slides.length} visuel${slides.length > 1 ? "s" : ""} téléchargé${slides.length > 1 ? "s" : ""}`);
    } finally { setBusy(false); }
  };

  return (
    <div className="studio">
      <div className="studio-top">
        <div>
          <label>Modèle</label>
          <select value={modele} onChange={(e) => setModele(e.target.value)}>{MODELES.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}</select>
        </div>
        <div>
          <label>Réseau</label>
          <select value={format} onChange={(e) => setFormat(e.target.value)}><option value="ig">Instagram (1080 × 1350)</option><option value="li">LinkedIn (1080 × 1080)</option></select>
        </div>
        <button className="page-gen-btn" onClick={() => stats && applyModele(modele, stats)} title="Recharge les chiffres du jour dans le modèle">Réinitialiser</button>
        <button className="page-gen-btn primary" onClick={downloadAll} disabled={busy || !slides.length}>{busy ? "Génération…" : `Télécharger ${slides.length > 1 ? `les ${slides.length} visuels` : "le visuel"}`}</button>
      </div>
      {stats && <p className="studio-note">Chiffres du {stats.date}, dernière édition BODACC du {stats.derniere_edition ? new Date(stats.derniere_edition).toLocaleDateString("fr-FR") : ""}. Tout est vérifiable.</p>}

      <div className="studio-body">
        <div className="studio-preview">
          <div className="studio-thumbs">
            {slides.map((s, i) => (
              <button key={i} className={`studio-thumb ${sel === i ? "active" : ""}`} onClick={() => setSel(i)}>
                <img src={urlFor(s, i)} alt={`Slide ${i + 1}`} loading="lazy" />
                <span>{i + 1}</span>
              </button>
            ))}
          </div>
          {slides[sel] && <img className="studio-main" src={urlFor(slides[sel], sel)} alt="Aperçu" />}
        </div>

        <div className="studio-edit">
          <h3>Slide {sel + 1} / {slides.length}</h3>
          <label>Fond</label>
          <select value={cur.bg || ""} onChange={(e) => update("bg", e.target.value)}><option value="">Crème</option><option value="dark">Sombre</option><option value="teal">Teal</option></select>
          <label>Surtitre</label><input value={cur.eyebrow || ""} onChange={(e) => update("eyebrow", e.target.value)} />
          <label>Chiffre géant</label><input value={cur.big || ""} onChange={(e) => update("big", e.target.value)} placeholder="ex : 47 305" />
          <label>Titre</label><textarea rows={2} value={cur.title || ""} onChange={(e) => update("title", e.target.value)} />
          <label>Mot en couleur (fin de titre)</label><input value={cur.hl || ""} onChange={(e) => update("hl", e.target.value)} />
          <label>Texte</label><textarea rows={3} value={cur.lead || ""} onChange={(e) => update("lead", e.target.value)} />
          <label>Citation (remplace le titre)</label><textarea rows={2} value={cur.quote || ""} onChange={(e) => update("quote", e.target.value)} />
          <label>Bouton</label><input value={cur.cta || ""} onChange={(e) => update("cta", e.target.value)} />
          <label>Pied (source)</label><input value={cur.tag || ""} onChange={(e) => update("tag", e.target.value)} />
          <div className="studio-slide-actions">
            <button className="page-gen-btn" onClick={() => { setSlides((a) => [...a.slice(0, sel + 1), { bg: "", title: "Nouvelle slide", tag: cur.tag }, ...a.slice(sel + 1)]); setSel(sel + 1); }}>+ Slide après</button>
            {slides.length > 1 && <button className="page-gen-btn" onClick={() => { setSlides((a) => a.filter((_, i) => i !== sel)); setSel(Math.max(0, sel - 1)); }}>Supprimer</button>}
          </div>
        </div>
      </div>

      <div className="studio-caption">
        <div className="studio-caption-head">
          <h3>Légende</h3>
          <button className="page-gen-btn" onClick={() => { navigator.clipboard?.writeText(legende); toast?.("Légende copiée"); }}>Copier</button>
        </div>
        <textarea rows={10} value={legende} onChange={(e) => setLegende(e.target.value)} />
        <p className="studio-note">Règles : ouvrir sur une scène, un détail concret par paragraphe, le chiffre arrive tard, chute factuelle, zéro emoji, zéro tiret cadratin, aucun chiffre qu'on ne peut pas prouver.</p>
      </div>
    </div>
  );
}
