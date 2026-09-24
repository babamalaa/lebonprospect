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
