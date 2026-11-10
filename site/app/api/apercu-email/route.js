// Aperçu des emails transactionnels (admin seulement, jamais indexé) : /api/apercu-email?cas=ok|zone|essai
import { getAuthedProfile } from "../../lib/auth";
import { confirmationClient } from "../../lib/emailConfirmation";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const profile = await getAuthedProfile(req);
  if (!profile || profile.role !== "admin") return new Response("Accès réservé.", { status: 403 });
  const cas = new URL(req.url).searchParams.get("cas") || "ok";
  const base = { prenom: "Jean", plan: "departemental", zone: { type: "departement", nom: "Rhône" }, zoneSaisie: "Rhône, 69", metier: "Agenceur restaurants", essai: false };
  const p = cas === "zone" ? { ...base, zone: null, zoneSaisie: "Lyon et alentours" } : cas === "essai" ? { ...base, essai: true } : base;
  const { html } = confirmationClient(p);
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" } });
}
