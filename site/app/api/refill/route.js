import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { getAuthedProfile } from "../../lib/auth";

const BATCH_SIZE = 15;
// On sur-fetch un pool plus large que le batch pour pouvoir scorer et
// prendre les meilleurs, sans avoir à trier en SQL sur des colonnes calculées.
const FETCH_POOL_SIZE = 150;

function scoreProspect(p) {
  let score = 0;
  if (p.nb_avis != null && p.nb_avis >= 6 && p.nb_avis <= 60) score += 2; // taille "artisan/patron direct"
  if (p.type_num === "mobile") score += 2; // 06/07, probable ligne directe du patron
  const nom = (p.societe || "").toLowerCase();
  if (/\bgroupe\b|\bgroup\b|\bfranchise\b/.test(nom)) score -= 3; // grosse structure probable
  return score;
}

export async function POST(req) {
  const profile = await getAuthedProfile(req);
  if (!profile) return Response.json({ error: "Non authentifié." }, { status: 401 });

  const { region } = await req.json().catch(() => ({}));
  const admin = supabaseAdmin();

  let query = admin
    .from("prospects_pool")
    .select("id, societe, nb_avis, type_num, outreach_sent_at")
    .is("closer_id", null)
    .eq("exclu_pool", false)
    .order("id", { ascending: true })
    .limit(FETCH_POOL_SIZE);

  if (region) query = query.eq("region", region);

  const { data: rows, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 400 });

  if (!rows || rows.length === 0) {
    return Response.json({ ok: true, n: 0, message: "Plus aucun prospect disponible dans ce périmètre pour le moment." });
  }

  // Score puis tri décroissant (meilleurs prospects en premier), on garde le batch
  // Bonus fort pour les prospects qui ont reçu l'email « un lead gratuit » il y a 2 à 7 jours :
  // l'appel n'est plus à froid (« vous avez reçu la reprise de X ? »), c'est là que le décroché est le meilleur.
  const now = Date.now();
  const outreachBonus = (r) => {
    if (!r.outreach_sent_at) return 0;
    const days = (now - new Date(r.outreach_sent_at).getTime()) / 86400000;
    if (days >= 2 && days <= 7) return 6;
    if (days > 7 && days <= 14) return 3;
    return 0;
  };
  const ranked = rows
    .map((r) => ({ ...r, _score: scoreProspect(r) + outreachBonus(r) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, BATCH_SIZE);

  const ids = ranked.map((r) => r.id);
  const { error: updateErr } = await admin
    .from("prospects_pool")
    .update({ closer_id: profile.id, claimed_at: new Date().toISOString() })
    .in("id", ids);

  if (updateErr) return Response.json({ error: updateErr.message }, { status: 400 });

  return Response.json({ ok: true, n: ids.length });
}
