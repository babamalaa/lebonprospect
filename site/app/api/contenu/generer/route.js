import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { getAuthedProfile } from "../../../lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODELS = (process.env.TEXT_MODELS || "gemini-2.5-flash,gemini-3.5-flash,gemini-2.5-flash-lite,gemini-3.1-flash-lite").split(",").map((m) => m.trim());
const BASE = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";

const SYSTEM = `Tu écris les posts Instagram et LinkedIn de LeBonProspect, un service français qui envoie chaque matin à 8h, aux fournisseurs B2B des commerces (agenceurs, équipementiers de cuisine, enseignistes, solutions de caisse, brasseurs, hottes, mobilier), la liste des commerces qui viennent de changer de propriétaire, avec le nom du repreneur et le téléphone de l'établissement. Source : BODACC (cessions de fonds de commerce, publiées au Journal officiel par obligation légale). Tarifs : Départemental 149 €/mois, Régional 299 €/mois, sans engagement. Tagline : « Le repreneur avant tout le monde. »

LIGNE ÉDITORIALE (non négociable)
1. La légende ouvre sur une SCÈNE, jamais sur un chiffre ni une annonce. Un personnage, un lieu, un moment (« Jeudi dernier, un type a racheté un restaurant à Bordeaux. »). La première ligne est la seule visible avant « voir plus » : elle doit donner envie, pas informer.
2. Un détail concret par paragraphe, celui qui fait que le lecteur se reconnaît (la chambre froide qui fait un bruit, l'enseigne encore au nom de l'ancien, le logiciel de caisse d'une autre époque).
3. Humour sec, jamais au détriment du prospect ni du repreneur.
4. Une ligne isolée au milieu du texte pour le coup de poing. Phrase courte, seule sur sa ligne.
5. Le chiffre arrive TARD, quand le lecteur est déjà dedans. Jamais dans les deux premiers paragraphes.
6. Chute sobre et factuelle : ce qu'on fait, en deux phrases, puis la source.
7. Phrases courtes. Zéro superlatif. Zéro « révolutionnaire », « incroyable », « game changer ».
8. On vend un client signé, jamais « du temps gagné ». Formule autorisée : « un client signé rembourse l'année ».
9. Ne jamais dire « leads qualifiés », « prospects qualifiés », « on vous fait gagner du temps ».

INTERDITS ABSOLUS
- Aucun emoji, nulle part.
- Aucun tiret cadratin (—) ni demi-cadratin ( – ). Utiliser la virgule, le point ou les deux-points.
- Aucun chiffre qui ne soit pas dans les DONNÉES fournies ci-dessous. Si l'idée demande un chiffre qu'on n'a pas, on écrit sans chiffre. Ne jamais arrondir un chiffre fourni vers un chiffre « plus rond ».
- Aucun témoignage, aucune citation de client, aucun nombre de clients (le service démarre).
- Aucune promesse d'exclusivité (« vous serez le seul »).
- Pas de lien dans la légende LinkedIn (le lien va en premier commentaire). Instagram : « Lien en bio ».

VISUELS
Tu produis des slides pour un moteur de rendu fixe. Chaque slide est un objet JSON : { "bg": "cream" | "dark" | "teal", "eyebrow": surtitre court en capitales (optionnel), "big": chiffre géant (optionnel, uniquement un chiffre des DONNÉES, formaté à la française avec espace des milliers), "title": titre court, 4 à 9 mots MAXIMUM, jamais une phrase complète ni une question longue (le développement va dans "lead"), "hl": 1 à 3 mots de fin de titre mis en couleur (optionnel), "lead": 1 à 2 phrases (max 32 mots, optionnel), "quote": phrase forte seule (remplace title, max 25 mots, optionnel), "items": liste de 3 à 4 { "b": 3-6 mots, "s": 6-10 mots } (optionnel), "stats": 2 à 4 { "n": chiffre, "l": libellé 2-4 mots } (optionnel), "cta": texte de bouton 3-6 mots (optionnel, dernière slide uniquement), "tag": pied de slide OBLIGATOIRE sur chaque slide : « Source : BODACC » ou le nom de la série (ex : « Stock vs signal ») }.
Règles visuelles : chaque slide a un titre court ET un lead (sauf les slides items/stats/quote) ; le lead porte la phrase, le titre porte l'idée en peu de mots. Alterner les fonds (jamais deux « dark » ou deux « teal » d'affilée, commencer par "cream" sauf si le post est un chiffre choc). Une image unique = 1 slide. Un carrousel = 4 à 6 slides : accroche, développement (2 à 4), chute avec cta. Une slide « items » ou « stats » ne porte ni lead ni big.

Réponds UNIQUEMENT avec un JSON valide, sans texte autour, de la forme :
{ "titre_interne": "…", "format": "image" | "carrousel", "slides": [ … ], "legende_instagram": "…", "legende_linkedin": "…", "premier_commentaire_linkedin": "…", "hashtags_instagram": "…", "hashtags_linkedin": "…", "chiffres_utilises": ["…"] }
Les légendes utilisent la séquence \\n\\n (backslash n, échappée JSON) entre paragraphes, jamais un retour à la ligne brut dans une chaîne. La légende LinkedIn fait 150 à 220 mots, l'Instagram 90 à 150 mots. « chiffres_utilises » liste chaque chiffre cité, avec sa source, pour vérification.`;

function donnees(s) {
  const r = (s.regions_chr_90j || []).map((x) => `${x.region} ${x.n}`).join(", ");
  const v = (s.villes_chr_90j || []).map((x) => `${x.ville} ${x.n}`).join(", ");
  const d = (s.dernieres_chr || []).map((x) => `${x.commercant} (${x.ville}, ${x.departement}), publié le ${x.date}${x.neuf ? ", société créée il y a moins de 6 mois" : ""}`).join(" ; ");
  return `DONNÉES RÉELLES (base LeBonProspect au ${s.date}, dernière édition BODACC du ${s.derniere_edition}). Ce sont les SEULS chiffres autorisés :
- Commerces ayant changé de propriétaire en France sur 12 mois (tous types) : ${s.total_12m}
- Soit par mois : ${s.par_mois} ; par jour ouvré : ${s.par_jour_ouvre}
- Restaurants, bars et hôtels (CHR) repris sur 12 mois : ${s.chr_12m} ; sur 90 jours : ${s.chr_90j} ; sur 30 jours : ${s.chr_30j}
- Part des fiches CHR livrées avec le téléphone (90 j) : ${s.pct_tel_chr_90j} %
- Part des repreneurs CHR ayant créé leur société il y a moins de 90 jours (« budgets ouverts ») : ${s.pct_neufs_chr_90j} %
- Dernière édition du BODACC : ${s.jour_type_total} commerces repris, dont ${s.jour_type_chr} CHR
- Top régions CHR sur 90 jours : ${r}
- Top villes CHR sur 90 jours : ${v}
- Le bulletin quotidien du BODACC fait environ 89 pages, tous secteurs mélangés, sans téléphone ni nom de dirigeant (fait établi, utilisable)
- Fenêtre d'achat d'un repreneur : les 90 jours qui suivent la reprise (fait établi, utilisable)
- Délai entre la publication et l'email : le lendemain à 8h (fait établi)
- Dernières reprises CHR réelles avec téléphone (noms utilisables tels quels, numéros jamais) : ${d}`;
}


const SLIDE_SCHEMA = {
  type: "OBJECT",
  properties: {
    bg: { type: "STRING", enum: ["cream", "dark", "teal"] },
    eyebrow: { type: "STRING" }, big: { type: "STRING" }, title: { type: "STRING" }, hl: { type: "STRING" },
    lead: { type: "STRING" }, quote: { type: "STRING" }, cta: { type: "STRING" }, tag: { type: "STRING" },
    items: { type: "ARRAY", items: { type: "OBJECT", properties: { b: { type: "STRING" }, s: { type: "STRING" } }, required: ["b"] } },
    stats: { type: "ARRAY", items: { type: "OBJECT", properties: { n: { type: "STRING" }, l: { type: "STRING" } }, required: ["n", "l"] } },
  },
  required: ["bg"],
};
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    titre_interne: { type: "STRING" },
    format: { type: "STRING", enum: ["image", "carrousel"] },
    slides: { type: "ARRAY", items: SLIDE_SCHEMA },
    legende_instagram: { type: "STRING" },
    legende_linkedin: { type: "STRING" },
    premier_commentaire_linkedin: { type: "STRING" },
    hashtags_instagram: { type: "STRING" },
    hashtags_linkedin: { type: "STRING" },
    chiffres_utilises: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["titre_interne", "format", "slides", "legende_instagram", "legende_linkedin", "premier_commentaire_linkedin", "hashtags_instagram", "hashtags_linkedin", "chiffres_utilises"],
};

const SUJETS_AUTO = [
  "Un repreneur de restaurant qui ne reçoit aucun appel de fournisseur pendant ses trois premiers mois",
  "Le bulletin du BODACC de 89 pages que personne ne lit, et ce qu'il contient vraiment",
  "La différence entre un fichier de tous les restaurants (le stock) et ceux qui ont changé de main hier (le signal)",
  "Ce que fait un nouveau patron de bar dans les 90 jours après la reprise, et à qui il dit oui",
  "Le badge « budgets ouverts » : pourquoi un repreneur qui vient de créer sa société est le meilleur client possible",
  "Un enseigniste qui travaille au bouche-à-oreille et découvre combien de commerces ont changé de main dans son rayon",
  "L'objection « c'est public, je peux le faire moi-même », prise au sérieux",
  "Une journée ordinaire au Journal officiel, racontée comme une scène",
  "Pourquoi on ne vend pas du temps gagné mais un client signé",
  "Les villes où les commerces changent de main en ce moment, et la surprise dans le classement",
];

async function gemini(body) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) throw new Error("Clé IA absente : ajoutez GEMINI_API_KEY dans les variables d'environnement Vercel.");
  let lastErr = "";
  for (const model of MODELS) {
    let r;
    try {
      r = await fetch(`${BASE}/models/${model}:generateContent?key=${key}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body), signal: AbortSignal.timeout(20000),
      });
    } catch (e) { lastErr = `${model}: trop lent`; continue; }
    if (!r.ok && r.status === 400 && body.generationConfig?.thinkingConfig) {
      const b2 = { ...body, generationConfig: { ...body.generationConfig } }; delete b2.generationConfig.thinkingConfig;
      try { r = await fetch(`${BASE}/models/${model}:generateContent?key=${key}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b2), signal: AbortSignal.timeout(20000) }); } catch { lastErr = `${model}: trop lent`; continue; }
    }
    if (r.ok) {
      const j = await r.json();
      const txt = j?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
      const fin = j?.candidates?.[0]?.finishReason;
      if (fin && fin !== "STOP") { lastErr = `${model}: réponse coupée (${fin})`; continue; }
      return { model, txt };
    }
    lastErr = `${model}: ${r.status} ${(await r.text()).slice(0, 200)}`;
    if (![400, 404, 429, 503].includes(r.status)) break;
  }
  throw new Error("IA indisponible (" + lastErr + ")");
}

export async function GET(req) {
  const profile = await getAuthedProfile(req);
  if (!profile || profile.role !== "admin") return Response.json({ error: "Non autorisé." }, { status: 403 });
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) return Response.json({ error: "Clé absente" }, { status: 503 });
  const r = await fetch(`${BASE}/models?key=${key}&pageSize=100`);
  const j = await r.json();
  const models = (j.models || []).filter((m) => (m.supportedGenerationMethods || []).includes("generateContent")).map((m) => m.name.replace("models/", ""));
  return Response.json({ configured: MODELS, available: models });
}

export async function POST(req) {
  const profile = await getAuthedProfile(req);
  if (!profile) return Response.json({ error: "Non authentifié." }, { status: 401 });
  if (profile.role !== "admin" && !profile.essai_autorise) return Response.json({ error: "Accès réservé." }, { status: 403 });

  const { idee, format, reseau, auto } = await req.json().catch(() => ({}));
  const admin = supabaseAdmin();
  const { data: stats, error } = await admin.rpc("contenu_stats");
  if (error) return Response.json({ error: error.message }, { status: 400 });

  const sujet = auto || !idee?.trim() ? SUJETS_AUTO[Math.floor(Math.random() * SUJETS_AUTO.length)] : idee.trim();
  const consigne = `SUJET DU POST : ${sujet}
FORMAT DEMANDÉ : ${format === "image" ? "image unique (1 slide)" : format === "carrousel" ? "carrousel (4 à 6 slides)" : "à ton choix selon le sujet"}
RÉSEAU PRINCIPAL : ${reseau === "li" ? "LinkedIn (le texte fait le travail, la slide arrête le scroll)" : "Instagram (les slides portent le message, la légende accompagne)"}

${donnees(stats)}

Écris le post maintenant. JSON uniquement.`;

  try {
    const { model, txt } = await gemini({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: consigne }] }],
      generationConfig: { temperature: 0.8, responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA, maxOutputTokens: 8000, thinkingConfig: { thinkingBudget: 0 } },
    });
    const parseLoose = (raw) => {
      let t = (raw || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
      const a = t.indexOf("{"), b = t.lastIndexOf("}");
      if (a >= 0 && b > a) t = t.slice(a, b + 1);
      try { return JSON.parse(t); } catch {}
      // virgules pendantes, retours a la ligne bruts dans les chaines
      t = t.replace(/,\s*([}\]])/g, "$1");
      try { return JSON.parse(t); } catch {}
      t = t.replace(/(?<=":\s*"[^"]*)\n(?=[^"]*")/g, "\\n");
      try { return JSON.parse(t); } catch { return null; }
    };
    const out = parseLoose(txt);
    if (!out || !Array.isArray(out.slides)) {
      console.error("IA JSON illisible:", txt.slice(0, 800));
      return Response.json({ error: "L'IA a répondu dans un format illisible, relancez.", brut: txt.slice(0, 600) }, { status: 502 });
    }
    // garde-fous : aucun emoji ni cadratin ne passe, quoi qu'il arrive
    for (const sl of out.slides) {
      if (sl.bg === "cream") sl.bg = "";
      if (!sl.tag) sl.tag = "Source : BODACC";
      // un titre de plus de 12 mots n'est pas un titre : on le déplace en lead et on garde ses 8 premiers mots en titre
      if (sl.title && sl.title.split(/\s+/).length > 12 && !sl.lead) {
        const w = sl.title.split(/\s+/); sl.lead = sl.title; sl.title = w.slice(0, 8).join(" ").replace(/[,:;.]$/, "");
      }
    }
    const clean = (t) => (t || "").replace(/[\u2014\u2013]/g, ",").replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "").replace(/ ,/g, ",");
    for (const s of out.slides) for (const k of ["eyebrow", "title", "hl", "lead", "quote", "cta", "tag", "big"]) if (s[k]) s[k] = clean(String(s[k]));
    for (const s of out.slides) { if (s.items) s.items = s.items.map((i) => ({ b: clean(i.b), s: clean(i.s) })); if (s.stats) s.stats = s.stats.map((i) => ({ n: clean(String(i.n)), l: clean(i.l) })); }
    for (const k of ["legende_instagram", "legende_linkedin", "premier_commentaire_linkedin", "titre_interne"]) out[k] = clean(out[k]);
    return Response.json({ ...out, sujet, model });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 503 });
  }
}
