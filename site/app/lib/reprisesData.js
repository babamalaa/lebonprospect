import { supabaseAdmin } from "./supabaseAdmin";

// ---------- Référentiels ----------

export const VERTICALES = {
  chr: {
    slug: "restaurants-bars-hotels",
    nom: "restaurants, bars et hôtels",
    court: "CHR",
    singulier: "un restaurant, un bar ou un hôtel",
    h1: "Reprises de restaurants, bars et hôtels",
    fournisseurs: "agenceurs, équipementiers de cuisine, solutions d'encaissement, enseignistes, brasseurs et distributeurs de boissons, assureurs professionnels",
    achats: "l'agencement de la salle, le matériel de cuisine, la caisse, l'enseigne, les contrats de boissons et l'assurance",
  },
  alimentaire: {
    slug: "commerces-alimentaires",
    nom: "commerces alimentaires",
    court: "alimentaire",
    singulier: "une boulangerie, une boucherie, une épicerie ou un primeur",
    h1: "Reprises de boulangeries, boucheries et commerces alimentaires",
    fournisseurs: "équipementiers (fours, vitrines réfrigérées, laboratoires), fournisseurs de matières premières, solutions d'encaissement, enseignistes, assureurs",
    achats: "le laboratoire, les vitrines réfrigérées, la caisse, l'enseigne et les contrats fournisseurs",
  },
  coiffure_beaute: {
    slug: "salons-coiffure-beaute",
    nom: "salons de coiffure et instituts de beauté",
    court: "coiffure & beauté",
    singulier: "un salon de coiffure ou un institut de beauté",
    h1: "Reprises de salons de coiffure et d'instituts de beauté",
    fournisseurs: "distributeurs de produits professionnels, fabricants de mobilier de salon, solutions de prise de rendez-vous et d'encaissement, enseignistes",
    achats: "le mobilier, les bacs et fauteuils, les produits, le logiciel de réservation et l'enseigne",
  },
  garage_auto: {
    slug: "garages-automobiles",
    nom: "garages et carrosseries",
    court: "automobile",
    singulier: "un garage, une carrosserie ou un centre auto",
    h1: "Reprises de garages, carrosseries et centres auto",
    fournisseurs: "distributeurs de pièces détachées, équipementiers d'atelier (ponts, outillage, diagnostic), fournisseurs de pneumatiques, logiciels de gestion d'atelier, assureurs",
    achats: "l'outillage d'atelier, les ponts élévateurs, le stock de pièces, le logiciel de gestion et les contrats de distribution",
  },
  sante: {
    slug: "pharmacies-sante",
    nom: "pharmacies et commerces de santé",
    court: "santé",
    singulier: "une pharmacie, une parapharmacie ou un magasin d'optique",
    h1: "Reprises de pharmacies, parapharmacies et commerces de santé",
    fournisseurs: "grossistes-répartiteurs, laboratoires, agenceurs d'officine, solutions logicielles métier, fabricants de mobilier et de robots de dispensation",
    achats: "l'agencement de l'officine, le logiciel métier, le mobilier, les automates et les contrats de répartition",
  },
};

export const REGIONS = [
  "Auvergne-Rhône-Alpes", "Bourgogne-Franche-Comté", "Bretagne", "Centre-Val de Loire", "Corse", "Grand Est",
  "Hauts-de-France", "Île-de-France", "Normandie", "Nouvelle-Aquitaine", "Occitanie", "Pays de la Loire",
  "Provence-Alpes-Côte d'Azur",
];

export function slugify(s) {
  return s
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/['’]/g, "-").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export const REGION_BY_SLUG = Object.fromEntries(REGIONS.map((r) => [slugify(r), r]));
export const VERTICALE_BY_SLUG = Object.fromEntries(Object.entries(VERTICALES).map(([k, v]) => [v.slug, k]));

// ---------- Helpers ----------

function maskTel(tel) {
  if (!tel) return null;
  const parts = tel.trim().split(/\s+/);
  if (parts.length >= 4) return [...parts.slice(0, 3), "██", "██"].join(" ");
  return tel.slice(0, Math.max(0, tel.length - 5)) + " ██ ██";
}

const iso = (d) => d.toISOString().slice(0, 10);
const since = (days) => iso(new Date(Date.now() - days * 86400000));

async function count(admin, verticale, region, extra = (q) => q) {
  let q = admin.from("cessions").select("id", { count: "exact", head: true }).eq("verticale", verticale);
  if (region) q = q.eq("region", region);
  const { count: c } = await extra(q);
  return c || 0;
}

// ---------- Stats d'une combinaison verticale × région (région optionnelle = France) ----------

export async function getReprisesStats(verticale, region = null) {
  const admin = supabaseAdmin();
  const s365 = since(365), s90 = since(90), s30 = since(30);

  const [n365, n90, n30, n365Tel] = await Promise.all([
    count(admin, verticale, region, (q) => q.gte("date_parution", s365)),
    count(admin, verticale, region, (q) => q.gte("date_parution", s90)),
    count(admin, verticale, region, (q) => q.gte("date_parution", s30)),
    count(admin, verticale, region, (q) => q.gte("date_parution", s365).not("telephone", "is", null)),
  ]);

  // top départements (12 mois) : agrégation côté SQL
  const { data: deptRows } = await admin.rpc("reprises_depts", { p_verticale: verticale, p_region: region, lim: 8 });
  const depts = (deptRows || []).map((d) => ({ nom: d.departement, n: Number(d.n) }));

  // dernières reprises (avec repreneur identifié)
  let rq = admin.from("cessions")
    .select("id, date_parution, acheteur_nom, place_name, ville, departement, telephone, acheteur_date_creation")
    .eq("verticale", verticale).not("acheteur_nom", "is", null)
    .order("date_parution", { ascending: false }).order("id", { ascending: false }).limit(6);
  if (region) rq = rq.eq("region", region);
  const { data: rows } = await rq;
  const dernieres = (rows || []).map((r) => {
    let badge = null;
    if (r.acheteur_date_creation) {
      const days = (new Date(r.date_parution) - new Date(r.acheteur_date_creation)) / 86400000;
      badge = days <= 90 ? "budgets ouverts" : "en expansion";
    }
    return {
      id: r.id, date: r.date_parution, acheteur: r.acheteur_nom, etablissement: r.place_name,
      ville: (r.ville || "").split(",")[0], departement: r.departement, telMasque: maskTel(r.telephone), badge,
    };
  });

  // dernière date de parution disponible
  let lq = admin.from("cessions").select("date_parution").eq("verticale", verticale).order("date_parution", { ascending: false }).limit(1);
  if (region) lq = lq.eq("region", region);
  const { data: last } = await lq;

  return {
    n365, n90, n30,
    perMonth: Math.round(n365 / 12),
    pctTel: n365 ? Math.round((100 * n365Tel) / n365) : 0,
    depts, dernieres,
    lastDate: last?.[0]?.date_parution || null,
  };
}

// ---------- Liste des combinaisons qui méritent une page (>= seuil sur 12 mois) ----------

export async function getIndexableCombos(minPerYear = 20) {
  const admin = supabaseAdmin();
  const { data } = await admin.rpc("reprises_combos", { min_n: minPerYear });
  return (data || [])
    .filter((c) => VERTICALES[c.verticale] && REGIONS.includes(c.region))
    .map((c) => ({ verticale: c.verticale, region: c.region, n: Number(c.n) }));
}

export function formatDateFr(isoDate) {
  if (!isoDate) return "";
  return new Date(isoDate + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
export const fmt = (n) => (n || 0).toLocaleString("fr-FR");
