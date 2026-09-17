import { supabaseAdmin } from "./supabaseAdmin";

// Pseudonymise les 4 derniers chiffres d'un téléphone : "06 22 72 17 75" -> "06 22 72 ██ ██"
function maskPhone(tel) {
  if (!tel) return null;
  const parts = tel.trim().split(/\s+/);
  if (parts.length >= 4) return [...parts.slice(0, 3), "██", "██"].join(" ");
  return tel.slice(0, Math.max(0, tel.length - 5)) + " ██ ██";
}

// Badge de fraîcheur : repreneur créé il y a moins de 90 jours = budgets ouverts, sinon en expansion
function freshnessBadge(dateCreation, dateParution) {
  if (!dateCreation) return null;
  const c = new Date(dateCreation);
  const p = new Date(dateParution);
  const days = (p - c) / 86400000;
  return days <= 90 ? "budgets ouverts" : "en expansion";
}

function shortRegion(r) {
  const map = {
    "Île-de-France": "IDF",
    "Auvergne-Rhône-Alpes": "AURA",
    "Provence-Alpes-Côte d'Azur": "PACA",
    "Nouvelle-Aquitaine": "N-Aquitaine",
    "Centre-Val de Loire": "Centre-VdL",
    "Bourgogne-Franche-Comté": "BFC",
    "Hauts-de-France": "HdF",
    "Pays de la Loire": "PdL",
  };
  return map[r] || r;
}

/**
 * Récupère les dernières cessions CHR réelles pour le feed de la landing.
 * Retourne { date, items: [...], nbSameDay, nbOthers }.
 */
export async function getLiveFeed() {
  const admin = supabaseAdmin();

  // dernière date de parution disponible en base pour la verticale CHR
  const { data: last } = await admin
    .from("cessions")
    .select("date_parution")
    .eq("verticale", "chr")
    .order("date_parution", { ascending: false })
    .limit(1);
  if (!last || last.length === 0) return null;
  const date = last[0].date_parution;

  const { data: rows } = await admin
    .from("cessions")
    .select("id, date_parution, acheteur_nom, place_name, ville, departement, region, telephone, acheteur_date_creation, cp")
    .eq("verticale", "chr")
    .eq("date_parution", date)
    .not("telephone", "is", null)
    .not("acheteur_nom", "is", null)
    .order("id", { ascending: false })
    .limit(8);

  const { count: nbSameDayAll } = await admin
    .from("cessions")
    .select("id", { count: "exact", head: true })
    .eq("date_parution", date);

  const items = (rows || []).map((r) => ({
    id: r.id,
    ville: r.ville,
    deptCode: r.cp ? r.cp.slice(0, 2) : null,
    departement: r.departement,
    region: shortRegion(r.region),
    acheteur: r.acheteur_nom,
    etablissement: r.place_name,
    telMasque: maskPhone(r.telephone),
    badge: freshnessBadge(r.acheteur_date_creation, r.date_parution),
  }));

  return { date, items, nbSameDayAll: nbSameDayAll || 0 };
}

/**
 * Chiffres clés réels pour la landing.
 */
export async function getLiveStats() {
  const admin = supabaseAdmin();
  const now = new Date();
  const d12 = new Date(now); d12.setMonth(d12.getMonth() - 12);
  const d1 = new Date(now); d1.setDate(d1.getDate() - 30);

  const [{ count: last12 }, { count: last30 }] = await Promise.all([
    admin.from("cessions").select("id", { count: "exact", head: true }).gte("date_parution", d12.toISOString().slice(0, 10)),
    admin.from("cessions").select("id", { count: "exact", head: true }).gte("date_parution", d1.toISOString().slice(0, 10)),
  ]);

  return {
    last12Months: last12 || 0,
    perMonth: Math.round((last12 || 0) / 12),
    last30Days: last30 || 0,
  };
}

export function formatDateFr(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
export function formatDateShort(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}
