import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { getAuthedProfile } from "../../lib/auth";

const CAT_LABELS = {
  agenceur: "l'agencement CHR",
  materiel_cuisine: "l'équipement de cuisine professionnelle",
  caisse: "les solutions d'encaissement",
  enseigniste: "l'enseigne et la signalétique",
  mobilier: "le mobilier professionnel",
};

function slugify(s) {
  let out = s.toLowerCase();
  const map = { é: "e", è: "e", ê: "e", à: "a", ç: "c", ô: "o", î: "i", û: "u", ë: "e", ï: "i" };
  for (const [a, b] of Object.entries(map)) out = out.replaceAll(a, b);
  return out.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

export async function POST(req) {
  const profile = await getAuthedProfile(req);
  if (!profile) return Response.json({ error: "Non authentifié." }, { status: 401 });

  const { prospect_id } = await req.json();
  if (!prospect_id) return Response.json({ error: "prospect_id manquant." }, { status: 400 });

  const admin = supabaseAdmin();

  const { data: prospect, error: pErr } = await admin
    .from("prospects_pool")
    .select("*")
    .eq("id", prospect_id)
    .single();
  if (pErr || !prospect) return Response.json({ error: "Prospect introuvable." }, { status: 404 });
  if (profile.role !== "admin" && prospect.closer_id !== profile.id) {
    return Response.json({ error: "Ce prospect ne vous appartient pas." }, { status: 403 });
  }

  const slug = slugify(prospect.societe);
  const url = `https://www.lebonprospect.fr/pour/${slug}`;

  // upsert dans generated_pages (idempotent : régénérer ne duplique pas)
  const { error: gErr } = await admin.from("generated_pages").upsert(
    {
      slug,
      societe: prospect.societe,
      categorie: prospect.categorie,
      region: prospect.region,
      ville: prospect.ville,
      closer_id: profile.id,
    },
    { onConflict: "slug" }
  );
  if (gErr) return Response.json({ error: gErr.message }, { status: 400 });

  // met à jour le lien du prospect
  await admin.from("prospects_pool").update({ lien_teaser: url, updated_at: new Date().toISOString() }).eq("id", prospect_id);

  return Response.json({ ok: true, url, metier: CAT_LABELS[prospect.categorie] || "votre métier" });
}
