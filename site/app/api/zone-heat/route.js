import { supabaseAdmin } from "../../lib/supabaseAdmin";
import geo from "../../lib/geo/geoData.json";

export const revalidate = 3600;

// Carte de chaleur de la section « Votre zone » : nombre de reprises publiées ces 30 derniers jours, par département
// de métropole (toutes activités, annulations exclues : même définition que /api/zone). Aucune donnée personnelle.
const CODE = Object.fromEntries(Object.entries(geo.noms).map(([code, nom]) => [nom, code]));

export async function GET() {
  const { data, error } = await supabaseAdmin().rpc("zone_heat", { p_jours: 30 });
  if (error) return Response.json({ error: "indisponible" }, { status: 503 });
  const parCode = {};
  for (const r of data || []) {
    const code = CODE[r.departement];
    if (code) parCode[code] = Number(r.n);          // DROM exclus : la carte ne couvre que la métropole
  }
  const valeurs = Object.values(parCode);
  return Response.json(
    { parCode, total: valeurs.reduce((s, n) => s + n, 0), max: Math.max(0, ...valeurs), min: valeurs.length ? Math.min(...valeurs) : 0, jours: 30 },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
