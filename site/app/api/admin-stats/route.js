import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { getAuthedProfile } from "../../lib/auth";

const PALIERS = [5, 7, 10];
const BONUS_PAR_PALIER = 75;
const PLAN_PRICE = { departemental: 149, regional: 299, national: 0 };

function bonusFor(nSigned) {
  return PALIERS.filter((p) => nSigned >= p).length * BONUS_PAR_PALIER;
}

export async function GET(req) {
  const profile = await getAuthedProfile(req);
  if (!profile) return Response.json({ error: "Non authentifié." }, { status: 401 });
  if (profile.role !== "admin") return Response.json({ error: "Réservé aux admins." }, { status: 403 });

  const admin = supabaseAdmin();

  const { data: closers, error: cErr } = await admin
    .from("closer_profiles")
    .select("id, full_name, email, role")
    .eq("role", "closer");
  if (cErr) return Response.json({ error: cErr.message }, { status: 400 });

  const { data: rows, error: pErr } = await admin
    .from("prospects_pool")
    .select("closer_id, statut, plan, montant, signed_at, exclu_pool");
  if (pErr) return Response.json({ error: pErr.message }, { status: 400 });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const perCloser = closers.map((c) => {
    const own = rows.filter((r) => r.closer_id === c.id);
    const total = own.length;
    const signed = own.filter((r) => r.statut === "signe");
    const signedThisMonth = signed.filter((r) => r.signed_at && new Date(r.signed_at) >= monthStart);
    const nSignedMonth = signedThisMonth.length;

    let commission = 0;
    signedThisMonth.forEach((r) => {
      const montant = r.montant || PLAN_PRICE[r.plan] || 0;
      commission += montant * 0.25;
    });
    const bonus = bonusFor(nSignedMonth);
    const exclu = !!c.exclu_commissions; // fondateur qui close : deals comptés, aucune commission due

    return {
      exclu_commissions: exclu,
      id: c.id,
      full_name: c.full_name,
      email: c.email,
      total_prospects: total,
      signed_total: signed.length,
      signed_this_month: nSignedMonth,
      commission_estimee: exclu ? 0 : Math.round(commission),
      bonus_palier: exclu ? 0 : bonus,
      total_du: exclu ? 0 : Math.round(commission) + bonus,
    };
  });

  const globalSignedThisMonth = perCloser.reduce((a, c) => a + c.signed_this_month, 0);
  const globalDu = perCloser.reduce((a, c) => a + c.total_du, 0);
  const globalTotalProspects = rows.filter((r) => !r.exclu_pool).length;
  const globalUnclaimed = rows.filter((r) => !r.closer_id && !r.exclu_pool).length;
  const globalMauvais = rows.filter((r) => r.statut === "mauvais_prospect").length;

  return Response.json({
    closers: perCloser.sort((a, b) => b.signed_this_month - a.signed_this_month),
    global: {
      signed_this_month: globalSignedThisMonth,
      total_du: globalDu,
      total_prospects_in_pool: globalTotalProspects,
      unclaimed_prospects: globalUnclaimed,
      mauvais_prospects: globalMauvais,
    },
  });
}
