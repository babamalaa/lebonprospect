import { supabaseAdmin } from "../../lib/supabaseAdmin";
import geo from "../../lib/geo/geoData.json";

export const revalidate = 3600;

// Carte de zone de la home : compteurs, points et dernières reprises d'un département.
// PUBLIC, donc : jamais de nom de repreneur, de dirigeant ni de téléphone dans la réponse.
// Seulement la raison sociale (enseigne quand on l'a), la commune et la date.

const MAX_PINS = 30;

function centreCp(cp) {
  return geo.cp[String(cp || "").slice(0, 5)] || null;
}
function projeter([lat, lon]) {
  const x = geo.proj.x[0] * lon + geo.proj.x[1] * lat + geo.proj.x[2];
  const y = geo.proj.y[0] * lon + geo.proj.y[1] * lat + geo.proj.y[2];
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}
// Raison sociale lisible : « BONBON COCO (LES GLOUGLOUTONS) » -> « Les Glougloutons » si une enseigne est entre parenthèses
function enseigne(r) {
  const m = /\(([^()]+)\)\s*$/.exec(r.acheteur_nom || "");
  const brut = (m ? m[1] : r.acheteur_nom || r.commercant || "").trim();
  if (!brut || /NON-DIFFUSIBLE/i.test(brut)) return "Commerce";
  return brut.toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
}

export async function GET(req) {
  const code = new URL(req.url).searchParams.get("dep") || "";
  const nom = geo.noms[code];
  if (!nom) return Response.json({ error: "département inconnu" }, { status: 400 });
  const admin = supabaseAdmin();
  const depuis = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const base = () => admin.from("cessions").select("id", { count: "exact", head: true })
    .eq("departement", nom).neq("type_avis", "Avis d’annulation");

  const [{ data: last }, { count: n30 }] = await Promise.all([
    admin.from("cessions").select("date_parution").order("date_parution", { ascending: false }).limit(1),
    base().gte("date_parution", depuis),
  ]);
  const derniere = last?.[0]?.date_parution || null;
  const { count: nDernier } = derniere ? await base().eq("date_parution", derniere) : { count: 0 };

  const { data: rows } = await admin.from("cessions")
    .select("id, date_parution, acheteur_nom, commercant, fonds_cp, cp, fonds_ville, ville, type_avis")
    .eq("departement", nom).gte("date_parution", depuis).neq("type_avis", "Avis d’annulation")
    .order("date_parution", { ascending: false }).order("id", { ascending: false }).limit(200);

  const pins = [];
  for (const r of rows || []) {
    if (pins.length >= MAX_PINS) break;
    const c = centreCp(r.fonds_cp || (r.cp || "").split(",")[0]);
    if (!c) continue;
    const [x, y] = projeter(c);
    pins.push({ x, y, hier: r.date_parution === derniere });
  }
  const liste = (rows || []).slice(0, 4).map((r) => ({
    nom: enseigne(r),
    commune: (r.fonds_ville || r.ville || "").split(",")[0].trim(),
    date: r.date_parution,
  }));
  return Response.json({ code, nom, n30: n30 || 0, nDernier: nDernier || 0, derniere, pins, liste },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
