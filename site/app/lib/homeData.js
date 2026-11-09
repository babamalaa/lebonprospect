import { supabaseAdmin } from "./supabaseAdmin";
import { libellePublic } from "./activite";

// Données de la home refondue (novembre 2026).
// Règle : rien d'inventé. Chaque chiffre vient de la table cessions ; les exemples sont de vraies reprises.

const fmtDate = (iso, opts) => new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", opts);
export const dateCourte = (iso) => (iso ? fmtDate(iso, { day: "2-digit", month: "2-digit" }) : "");
export const dateLongue = (iso) => (iso ? fmtDate(iso, { day: "numeric", month: "long", year: "numeric" }) : "");
export const dateNum = (iso) => (iso ? fmtDate(iso, { day: "2-digit", month: "2-digit", year: "numeric" }) : "");

// « Cessions publiées par mois » = moyenne des 12 derniers MOIS COMPLETS (le mois en cours, partiel, est exclu).
export async function getChiffres() {
  const admin = supabaseAdmin();
  const now = new Date();
  const fin = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));          // 1er du mois en cours
  const debut = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 12, 1));    // 12 mois complets avant
  const iso = (d) => d.toISOString().slice(0, 10);
  const [{ count: n12 }, { data: last }] = await Promise.all([
    admin.from("cessions").select("id", { count: "exact", head: true })
      .gte("date_parution", iso(debut)).lt("date_parution", iso(fin)).neq("type_avis", "Avis d’annulation"),
    admin.from("cessions").select("date_parution").order("date_parution", { ascending: false }).limit(1),
  ]);
  const derniere = last?.[0]?.date_parution || null;
  let nDernier = 0;
  if (derniere) {
    const { count } = await admin.from("cessions").select("id", { count: "exact", head: true }).eq("date_parution", derniere);
    nDernier = count || 0;
  }
  return { parMois: Math.round((n12 || 0) / 12), sur12Mois: n12 || 0, derniere, nDernier };
}

// Les 3 reprises d'exemple (hero et email d'exemple) : vraies reprises CHR publiées le 06/09/2026 en
// Auvergne-Rhône-Alpes (ids 47680, 47711, 47738, vérifiées en base), présentées comme un EXEMPLE d'édition.
// ANONYMISÉES (décision du 9 nov. 2026, en attendant l'avis juridique) : activité et commune seulement,
// aucun nom de repreneur, numéro masqué. Le nom complet et le numéro ne figurent que dans l'email des abonnés.
// Badge : « budgets ouverts » si la société repreneuse a moins de 90 jours à la parution, sinon « en expansion ».
export const EXEMPLE = {
  date: "2026-09-06",
  zone: "Auvergne-Rhône-Alpes",
  metier: "Restaurants, bars & hôtels",
  nZone: 5,          // reprises CHR publiées ce jour-là en Auvergne-Rhône-Alpes (compté en base)
  rows: [
    { name: "Restaurant, brasserie", place: "Lyon · Rhône", phone: "04 72 ●● ●● ●●", badge: "budgets ouverts" },
    { name: "Restauration rapide", place: "Ambérieu-en-Bugey · Ain", phone: "04 74 ●● ●● ●●", badge: "en expansion" },
    { name: "Restaurant, bar, café", place: "Optevoz · Isère", phone: "09 61 ●● ●● ●●", badge: "en expansion" },
  ],
};

function badge(dateCreation, dateParution) {
  if (!dateCreation) return null;
  return (new Date(dateParution) - new Date(dateCreation)) / 86400000 <= 90 ? "budgets ouverts" : "en expansion";
}

// Flux en direct : 3 lignes visibles (enseigne, commune, département, badge). Le repreneur et le téléphone ne
// quittent JAMAIS le serveur : seule l'information « repreneur identifié / numéro vérifié » est transmise.
// Les lignes floutées sont des squelettes vides côté navigateur.
export async function getFlux() {
  const admin = supabaseAdmin();
  const { data: last } = await admin.from("cessions").select("date_parution").eq("verticale", "chr")
    .order("date_parution", { ascending: false }).limit(1);
  const date = last?.[0]?.date_parution;
  if (!date) return null;
  const [{ data: rows }, { count: nJour }] = await Promise.all([
    admin.from("cessions")
      .select("id, date_parution, acheteur_nom, naf_fonds, fonds_activite, verticale, fonds_ville, ville, departement, cp, fonds_cp, acheteur_date_creation, telephone, tel_validation")
      .eq("verticale", "chr").eq("date_parution", date).not("acheteur_nom", "is", null)
      .neq("type_avis", "Avis d’annulation").order("id", { ascending: false }).limit(12),
    admin.from("cessions").select("id", { count: "exact", head: true }).eq("date_parution", date),
  ]);
  const verifie = (r) => r.telephone && r.tel_validation && !String(r.tel_validation).startsWith("rejete");
  const tri = (rows || []).sort((a, b) => Number(!!verifie(b)) - Number(!!verifie(a)));
  const items = tri.slice(0, 3).map((r) => ({
    id: r.id,
    nom: libellePublic(r.acheteur_nom, r.naf_fonds, r.fonds_activite, r.verticale),
    commune: (r.fonds_ville || r.ville || "").split(",")[0].trim(),
    dep: (r.fonds_cp || r.cp || "").slice(0, 2),
    departement: r.departement,
    numero: !!verifie(r),
    badge: badge(r.acheteur_date_creation, r.date_parution),
  }));
  return { date, items, autres: Math.max(0, (nJour || 0) - items.length) };
}
