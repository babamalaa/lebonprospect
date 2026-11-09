import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { getAuthedProfile } from "../../lib/auth";

export const dynamic = "force-dynamic";

// Tableau de santé (admin uniquement, lecture seule) : pour chacun des 14 derniers jours,
// l'édition BODACC, l'ingestion, les envois, la livraison réelle (webhooks Resend), Google (requêtes, coût, erreurs).
// But : qu'une panne comme celle des numéros (20 oct. → 5 nov. 2026) se voie le premier matin.

const jourParis = (iso) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });

export async function GET(req) {
  const profile = await getAuthedProfile(req);
  if (!profile) return Response.json({ error: "Non authentifié." }, { status: 401 });
  if (profile.role !== "admin") return Response.json({ error: "Accès réservé." }, { status: 403 });
  const admin = supabaseAdmin();
  const depuis = new Date(Date.now() - 15 * 86400000).toISOString();
  const depuisJour = depuis.slice(0, 10);

  const [{ data: runs }, { data: logs }, { data: events }, { data: subs }, { data: ced }, { data: alertes }] = await Promise.all([
    admin.from("pipeline_runs").select("etape, debut, ok, nb, nb_ok, requetes_google, cout_estime_eur, erreur").gte("debut", depuis).order("debut"),
    admin.from("digests_log").select("subscriber_id, resend_id, type, created_at, lead_snapshot").gte("created_at", depuis).limit(2000),
    admin.from("email_events").select("resend_id, type, created_at").gte("created_at", depuis),
    admin.from("subscribers").select("id, email, statut, suivi_test, sans_numeros").eq("statut", "actif"),
    admin.from("sante_cessions_jour").select("d, avis, cherchees, validees").gte("d", depuisJour),
    admin.from("lbp_dispatch_log").select("workflow, note, created_at").like("workflow", "alerte%").gte("created_at", depuis).order("created_at", { ascending: false }),
  ]);

  // statut réel de chaque mail (webhooks)
  const statut = {};
  const rang = { "email.bounced": 5, "email.complained": 4, "email.delivered": 3, "email.delivery_delayed": 2, "email.sent": 1 };
  for (const e of events || []) {
    if ((rang[e.type] || 0) > (rang[statut[e.resend_id]] || 0)) statut[e.resend_id] = e.type;
  }
  const actifs = (subs || []).length;
  const jours = [];
  for (let i = 0; i < 14; i++) {
    const d = jourParis(Date.now() - i * 86400000);
    const r = (runs || []).filter((x) => jourParis(x.debut) === d);
    const l = (logs || []).filter((x) => jourParis(x.created_at) === d);
    const c = (ced || []).find((x) => x.d === d) || { avis: 0, cherchees: 0, validees: 0 };
    const servis = new Set(l.map((x) => x.subscriber_id)).size;
    const avecSuivi = l.filter((x) => x.resend_id && x.created_at >= "2026-11-09");     // webhooks branchés le 9 nov. 2026
    const livres = avecSuivi.filter((x) => statut[x.resend_id] === "email.delivered").length;
    const rejetes = avecSuivi.filter((x) => ["email.bounced", "email.complained"].includes(statut[x.resend_id])).length;
    const sansStatut = avecSuivi.filter((x) => !statut[x.resend_id]).length;
    const google = r.filter((x) => x.etape.startsWith("places"));
    const reqG = google.reduce((s, x) => s + (x.requetes_google || 0), 0);
    const coutG = google.reduce((s, x) => s + Number(x.cout_estime_eur || 0), 0);
    const errG = google.find((x) => x.erreur);
    const cherchees = c.cherchees, validees = c.validees;
    // Ce que les CLIENTS ont réellement reçu : fiches et numéros dans les emails du jour (hors adresse de test sans numéros).
    // C'est ce contrôle qui aurait montré la panne du 20 oct. au 5 nov. 2026 dès le premier matin.
    const sansNum = new Set((subs || []).filter((x) => x.sans_numeros).map((x) => x.id));
    const fichesClients = l.filter((x) => !sansNum.has(x.subscriber_id)).flatMap((x) => x.lead_snapshot || []);
    const fichesTel = fichesClients.filter((f) => f.tel).length;
    const ingest = r.filter((x) => x.etape === "ingest");
    const problemes = [];
    if (servis < actifs && d !== jourParis(Date.now())) problemes.push(`${actifs - servis} abonné(s) sans email`);
    if (rejetes) problemes.push(`${rejetes} email(s) rejeté(s) ou signalé(s) spam`);
    if (errG) problemes.push("Google refuse les recherches");
    if (fichesClients.length >= 4 && fichesTel === 0) problemes.push(`emails clients sans aucun numéro (${fichesClients.length} fiches)`);
    if (ingest.some((x) => x.ok === false)) problemes.push("ingestion en échec");
    if (coutG > 2) problemes.push(`coût Google ${coutG.toFixed(2)} €`);
    jours.push({
      d, ok: problemes.length === 0, problemes,
      avis: c.avis, fichesClients: fichesClients.length, fichesTel, ingestion: ingest.length ? ingest[ingest.length - 1].ok : null,
      abonnes: actifs, servis, emails: l.length, livres, rejetes, sansStatut, suiviLivraison: avecSuivi.length > 0,
      google: { requetes: reqG, cout: Math.round(coutG * 100) / 100, cherchees, validees, erreur: errG?.erreur || null },
    });
  }
  const moisCourant = jourParis(Date.now()).slice(0, 7);
  const { data: runsMois } = await admin.from("pipeline_runs").select("cout_estime_eur, requetes_google").gte("debut", `${moisCourant}-01`);
  const coutMois = (runsMois || []).reduce((s, x) => s + Number(x.cout_estime_eur || 0), 0);
  const reqMois = (runsMois || []).reduce((s, x) => s + (x.requetes_google || 0), 0);
  return Response.json({ jours, abonnes: actifs, coutMois: Math.round(coutMois * 100) / 100, reqMois, alertes: (alertes || []).slice(0, 10) });
}
