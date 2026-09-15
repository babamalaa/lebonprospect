import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { getAuthedProfile } from "../../lib/auth";

const PALIERS = [5, 7, 10];
const BONUS_PAR_PALIER = 75;
const PLAN_PRICE = { departemental: 149, regional: 299, national: 0 };
const PLAN_LABEL = { departemental: "Départemental", regional: "Régional", national: "National" };

function bonusFor(nSigned) {
  return PALIERS.filter((p) => nSigned >= p).length * BONUS_PAR_PALIER;
}

function csvEscape(v) {
  const s = String(v ?? "");
  if (s.includes(";") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req) {
  const profile = await getAuthedProfile(req);
  if (!profile) return Response.json({ error: "Non authentifié." }, { status: 401 });
  if (profile.role !== "admin") return Response.json({ error: "Réservé aux admins." }, { status: 403 });

  const admin = supabaseAdmin();

  const { data: closers } = await admin.from("closer_profiles").select("id, full_name, email").eq("role", "closer");
  const { data: rows } = await admin
    .from("prospects_pool")
    .select("closer_id, societe, statut, plan, montant, signed_at")
    .eq("statut", "signe");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const closerMap = Object.fromEntries((closers || []).map((c) => [c.id, c]));

  // Ligne détail par deal signé ce mois-ci
  const lines = [
    ["Closer", "Email", "Société", "Formule", "Montant (€)", "Commission (25%, €)", "Date signature"].map(csvEscape).join(";"),
  ];

  const signedThisMonthByCloser = {};
  (rows || []).forEach((r) => {
    if (!r.signed_at || new Date(r.signed_at) < monthStart) return;
    const c = closerMap[r.closer_id];
    const montant = r.montant || PLAN_PRICE[r.plan] || 0;
    const commission = Math.round(montant * 0.25);
    signedThisMonthByCloser[r.closer_id] = (signedThisMonthByCloser[r.closer_id] || 0) + 1;
    lines.push(
      [
        c?.full_name || "?",
        c?.email || "?",
        r.societe,
        PLAN_LABEL[r.plan] || r.plan || "-",
        montant,
        commission,
        new Date(r.signed_at).toLocaleDateString("fr-FR"),
      ]
        .map(csvEscape)
        .join(";")
    );
  });

  lines.push("");
  lines.push(["Récap paliers de volume par closer"].map(csvEscape).join(";"));
  lines.push(["Closer", "Deals signés ce mois", "Bonus palier (€)"].map(csvEscape).join(";"));
  (closers || []).forEach((c) => {
    const n = signedThisMonthByCloser[c.id] || 0;
    lines.push([c.full_name, n, bonusFor(n)].map(csvEscape).join(";"));
  });

  const csv = "\uFEFF" + lines.join("\n"); // BOM pour Excel/UTF-8
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="commissions_${now.toISOString().slice(0, 7)}.csv"`,
    },
  });
}
