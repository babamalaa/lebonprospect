import { supabaseAdmin } from "../../lib/supabaseAdmin";
import geo from "../../lib/geo/geoData.json";
import { libellePublic } from "../../lib/activite";

export const revalidate = 3600;

// Carte de zone de la home : compteurs, points et dernières reprises d'un département.
// PUBLIC, donc : jamais de nom de repreneur, de dirigeant ni de téléphone dans la réponse.
// Seulement l'enseigne (quand elle est donnée) ou l'activité, la commune et la date. Jamais la raison sociale seule :
// pour un entrepreneur individuel, c'est son nom.

const MAX_PINS = 30;

function centreCp(cp) {
  return geo.cp[String(cp || "").slice(0, 5)] || null;
}
function projeter([lat, lon]) {
  const x = geo.proj.x[0] * lon + geo.proj.x[1] * lat + geo.proj.x[2];
  const y = geo.proj.y[0] * lon + geo.proj.y[1] * lat + geo.proj.y[2];
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

export async function GET(req) {
  const code = new URL(req.url).searchParams.get("dep") || "";
  const nom = geo.noms[code];
  if (!nom) return Response.json({ error: "département inconnu" }, { status: 400 });
  const admin = supabaseAdmin();
  const depuis = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  // Même filtre que l'email CHR (fetch_leads("chr") dans pipeline/digest.py) : verticale chr, annulations exclues (décision du 11 nov. 2026)
  const base = () => admin.from("cessions").select("id", { count: "exact", head: true })
    .eq("departement", nom).eq("verticale", "chr").neq("type_avis", "Avis d’annulation");

  const [{ data: last }, { count: n30 }] = await Promise.all([
    admin.from("cessions").select("date_parution").eq("verticale", "chr").order("date_parution", { ascending: false }).limit(1),
    base().gte("date_parution", depuis),
  ]);
  const derniere = last?.[0]?.date_parution || null;
  const { count: nDernier } = derniere ? await base().eq("date_parution", derniere) : { count: 0 };

  const { data: rows } = await admin.from("cessions")
    .select("id, date_parution, acheteur_nom, naf_fonds, fonds_activite, verticale, fonds_cp, cp, fonds_ville, ville, type_avis")
    .eq("departement", nom).eq("verticale", "chr").gte("date_parution", depuis).neq("type_avis", "Avis d’annulation")
    .order("date_parution", { ascending: false }).order("id", { ascending: false }).limit(200);

  // Un point par commune (centre du code postal) : plusieurs reprises au même endroit forment un seul point,
  // un peu plus gros (n = nombre de reprises), au lieu de pastilles empilées illisibles.
  const parLieu = new Map();
  for (const r of rows || []) {
    const c = centreCp(r.fonds_cp || (r.cp || "").split(",")[0]);
    if (!c) continue;
    const [x, y] = projeter(c);
    const k = `${x},${y}`;
    const p = parLieu.get(k);
    if (p) { p.n += 1; p.hier = p.hier || r.date_parution === derniere; }
    else if (parLieu.size < MAX_PINS) parLieu.set(k, { x, y, n: 1, hier: r.date_parution === derniere });
  }
  const pins = [...parLieu.values()];
  // 4 dernières reprises, en privilégiant celles dont on sait dire l'activité (sinon « Fonds de commerce »)
  const lib = (r) => libellePublic(r.acheteur_nom, r.naf_fonds, r.fonds_activite, r.verticale);
  const parlantes = (rows || []).filter((r) => lib(r) !== "Fonds de commerce");
  const choix = [...parlantes, ...(rows || []).filter((r) => lib(r) === "Fonds de commerce")].slice(0, 4)
    .sort((a, b) => (b.date_parution > a.date_parution ? 1 : b.date_parution < a.date_parution ? -1 : b.id - a.id));
  const liste = choix.map((r) => ({
    nom: lib(r),
    commune: (r.fonds_ville || r.ville || "").split(",")[0].trim(),
    date: r.date_parution,
  }));
  return Response.json({ code, nom, n30: n30 || 0, nDernier: nDernier || 0, derniere, pins, liste },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
