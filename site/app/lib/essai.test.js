import { describe, it, expect } from "vitest";
import { buildEssaiSubscriber, essaiRefuse, ESSAI_JOURS } from "./essai";

const NOW = new Date("2026-09-24T10:00:00Z");
const base = { societe: "AGENCEMENT TEST", region: "Occitanie", ville: "Toulouse", telephone: "05 00 00 00 00", categorie: "Agencement", email: "Contact@Example.com" };

describe("buildEssaiSubscriber", () => {
  it("crée un abonné régional avec fin d'essai à J+7", () => {
    const { row, error } = buildEssaiSubscriber(base, "regional", NOW);
    expect(error).toBeUndefined();
    expect(row.email).toBe("contact@example.com");
    expect(row.regions).toEqual(["Occitanie"]);
    expect(row.departements).toBeNull();
    expect(row.essai).toBe(true);
    expect(row.essai_source).toBe("dashboard");
    expect(row.statut).toBe("actif");
    expect(new Date(row.essai_fin).getTime() - NOW.getTime()).toBe(ESSAI_JOURS * 86400000);
  });
  it("refuse un prospect sans email", () => {
    expect(buildEssaiSubscriber({ ...base, email: null }, "regional", NOW).error).toMatch(/email/);
    expect(buildEssaiSubscriber({ ...base, email: "pas-un-email" }, "regional", NOW).error).toMatch(/email/);
  });
  it("refuse le plan national", () => {
    expect(buildEssaiSubscriber(base, "national", NOW).error).toMatch(/Départemental ou Régional/);
  });
  it("refuse une zone inconnue", () => {
    expect(buildEssaiSubscriber({ ...base, region: "Atlantide" }, "regional", NOW).error).toMatch(/Zone non reconnue/);
  });
  it("refuse Départemental quand la zone est une région", () => {
    expect(buildEssaiSubscriber(base, "departemental", NOW).error).toMatch(/Régional/);
  });
  it("accepte Départemental quand region contient un code", () => {
    const { row, error } = buildEssaiSubscriber({ ...base, region: "Rhône, 69" }, "departemental", NOW);
    expect(error).toBeUndefined();
    expect(row.departements).toEqual(["Rhône"]);
    expect(row.regions).toBeNull();
  });
  it("normalise les alias de région", () => {
    expect(buildEssaiSubscriber({ ...base, region: "PACA" }, "regional", NOW).row.regions).toEqual(["Provence-Alpes-Côte d'Azur"]);
  });
});

describe("essaiRefuse", () => {
  it("laisse passer un email inconnu", () => {
    expect(essaiRefuse(null)).toBeNull();
  });
  it("refuse un abonné payant, même résilié", () => {
    expect(essaiRefuse({ statut: "resilie", essai: false, premier_paiement_at: "2026-05-01T00:00:00Z" })).toMatch(/déjà abonné/);
  });
  it("refuse un abonné actif (payant ou essai en cours, Stripe ou dashboard)", () => {
    expect(essaiRefuse({ statut: "actif", essai: true, premier_paiement_at: null })).toMatch(/déjà abonné/);
  });
  it("refuse un second essai après un essai expiré", () => {
    expect(essaiRefuse({ statut: "pause", essai: true, premier_paiement_at: null })).toMatch(/déjà eu un essai/);
  });
  it("laisse passer une ligne inactive sans essai ni paiement", () => {
    expect(essaiRefuse({ statut: "pause", essai: false, premier_paiement_at: null })).toBeNull();
  });
});

// --- Route POST /api/sign-deal avec Supabase et l'authentification mockés (aucun réseau) ---
import { vi, beforeEach } from "vitest";

const state = vi.hoisted(() => ({ db: null, profile: null }));
vi.mock("./supabaseAdmin", () => ({ supabaseAdmin: () => state.db }));
vi.mock("./auth", () => ({ getAuthedProfile: async () => state.profile }));
const { POST } = await import("../api/sign-deal/route.js");

/** Faux client Supabase : enregistre les écritures, répond selon le scénario. */
function fakeDb({ prospect, existing = null, upsertError = null }) {
  const writes = [];
  const from = (table) => {
    const q = { table, op: null, payload: null, opts: null, filters: [] };
    const b = {
      select() { return b; },
      eq(k, v) { q.filters.push([k, v]); return b; },
      update(p) { q.op = "update"; q.payload = p; writes.push(q); return b; },
      upsert(p, o) { q.op = "upsert"; q.payload = p; q.opts = o; writes.push(q); return b; },
      maybeSingle: async () => ({ data: existing, error: null }),
      single: async () => {
        if (table === "prospects_pool") return prospect ? { data: prospect, error: null } : { data: null, error: { message: "introuvable" } };
        return upsertError ? { data: null, error: { message: upsertError } } : { data: { id: 42 }, error: null };
      },
      then(res, rej) { return Promise.resolve({ error: null }).then(res, rej); },
    };
    return b;
  };
  return { from, writes };
}

const PROSPECT = { id: 7, closer_id: "u1", societe: "AGENCEMENT TEST", region: "Occitanie", ville: "Toulouse", telephone: "05 00 00 00 00", categorie: "Agencement", email: "contact@example.com" };
const call = (body) => POST(new Request("http://test.local/api/sign-deal", { method: "POST", body: JSON.stringify(body) }));

describe("POST /api/sign-deal (Supabase mocké)", () => {
  beforeEach(() => {
    delete process.env.RESEND_API_KEY; // sendResend ne part jamais en test
    state.profile = { id: "u1", role: "closer", full_name: "Closer Test", essai_autorise: true };
  });

  it("essai : crée l'abonné puis relie le prospect", async () => {
    state.db = fakeDb({ prospect: PROSPECT });
    const res = await call({ prospect_id: 7, plan: "regional", essai: true });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, essai_demarre: true, subscriber_id: 42 });
    const [up, upd] = state.db.writes;
    expect(up.table).toBe("subscribers");
    expect(up.opts).toEqual({ onConflict: "email" });
    expect(up.payload).toMatchObject({ email: "contact@example.com", essai: true, essai_source: "dashboard", regions: ["Occitanie"], statut: "actif" });
    expect(upd.table).toBe("prospects_pool");
    expect(upd.payload).toMatchObject({ statut: "signe", essai: true, subscriber_id: 42, montant: 299 });
    expect(upd.filters).toEqual([["id", 7]]);
  });

  it("essai refusé si l'email est déjà abonné : aucune écriture", async () => {
    state.db = fakeDb({ prospect: PROSPECT, existing: { id: 3, statut: "actif", essai: false, premier_paiement_at: "2026-08-01T00:00:00Z" } });
    const res = await call({ prospect_id: 7, plan: "regional", essai: true });
    expect(res.status).toBe(409);
    expect(state.db.writes).toEqual([]);
  });

  it("essai refusé pour un prospect sans email : aucune écriture", async () => {
    state.db = fakeDb({ prospect: { ...PROSPECT, email: null } });
    const res = await call({ prospect_id: 7, plan: "regional", essai: true });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/email/);
    expect(state.db.writes).toEqual([]);
  });

  it("échec de l'upsert : le prospect n'est pas marqué signé", async () => {
    state.db = fakeDb({ prospect: PROSPECT, upsertError: "column essai_source does not exist" });
    const res = await call({ prospect_id: 7, plan: "regional", essai: true });
    expect(res.status).toBe(400);
    expect(state.db.writes.map((w) => w.table)).toEqual(["subscribers"]);
  });

  it("essai sur un compte non autorisé : 403, aucune écriture", async () => {
    state.profile = { ...state.profile, essai_autorise: false };
    state.db = fakeDb({ prospect: PROSPECT });
    const res = await call({ prospect_id: 7, plan: "regional", essai: true });
    expect(res.status).toBe(403);
    expect(state.db.writes).toEqual([]);
  });

  it("deal sans essai : comportement inchangé, pas d'abonné créé ni de subscriber_id écrit", async () => {
    state.db = fakeDb({ prospect: PROSPECT });
    const res = await call({ prospect_id: 7, plan: "departemental" });
    expect(await res.json()).toEqual({ ok: true, essai_demarre: false, subscriber_id: null });
    expect(state.db.writes).toHaveLength(1);
    expect(state.db.writes[0].table).toBe("prospects_pool");
    expect(state.db.writes[0].payload).not.toHaveProperty("subscriber_id");
    expect(state.db.writes[0].payload).toMatchObject({ statut: "signe", essai: false, montant: 149 });
  });
});
