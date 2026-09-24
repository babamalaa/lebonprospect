# Plan 3 : Essai 7 jours activé depuis le dashboard, sans carte bancaire

> **Pour l'agent qui exécute (Claude Code cloud) :** exécute ce plan tâche par tâche, dans l'ordre, en committant après chaque tâche. Ouvre une PR unique nommée `feat: essai 7 jours activable depuis le dashboard (sans carte)` vers `main`. Ne modifie AUCUN fichier hors de la liste « Fichiers autorisés ». Tu n'as accès à aucun secret : ne tente jamais de contacter Supabase, Stripe ou Resend. Tout ce qui touche à la base se prouve par des tests unitaires avec des clients mockés.

**Objectif :** quand Lawrenza (compte `essai_autorise`) choisit « Essai 7 j » sur un prospect, l'abonné est créé immédiatement en base et **reçoit son premier digest le lendemain 8h**, sans passer par Stripe. À J+5, un email lui demande d'ajouter sa carte (lien Stripe existant). À J+8 sans paiement, l'essai s'arrête tout seul (plus de digest).

**Pourquoi :** aujourd'hui `sign-deal` avec `essai=true` ne fait que marquer le prospect `signe`. Aucune ligne `subscribers` n'est créée : le prospect ne reçoit rien tant qu'il n'a pas mis sa carte sur le Payment Link Stripe. Les deux seules pages de paiement ouvertes à ce jour ont été fermées sans saisir un email. On inverse : le produit d'abord, la carte après l'avoir vu.

**Architecture :** une seule route `sign-deal` enrichie (upsert `subscribers` quand `essai` est vrai), un envoi de rappel J+5 ajouté au cron Python existant, et une règle « essai expiré = pas de digest » dans `send_digests.py`. Le webhook Stripe existant fait déjà la conversion (`invoice.paid` pose `premier_paiement_at`) : on ne le touche pas, on s'assure juste que l'upsert par email le relie à la bonne ligne.

**Stack :** Next.js (App Router, JS, pas de TS), Supabase JS admin client, Python 3.12 stdlib + pytest (suite existante dans `pipeline/tests/`).

---

## Contexte que tu dois connaître

### Le modèle de données (vérifie dans `pipeline/schema.sql` et les migrations éparses)
- `subscribers` : `email` (unique), `nom`, `societe`, `plan` ('departemental'|'regional'|'national'), `verticales text[]` (défaut `{chr}`), `departements text[]`, `regions text[]`, `villes text[]`, `zone_label`, `statut` ('actif'|'pause'|'resilie'|'essai'), `dernier_digest date`, `stripe_customer_id`, `stripe_subscription_id`, `stripe_status`, `essai boolean`, `essai_fin timestamptz`, `source`, `telephone`, `secteur`, `zone_saisie`, `premier_paiement_at`, `resilie_at`, `created_at`.
- `prospects_pool` : `id`, `societe`, `categorie`, `region` (libellé région exact de la table `cessions`), `ville`, `telephone`, `email` (peut être null), `site_web`, `statut`, `plan`, `montant`, `essai`, `signed_at`, `closer_id`, `exclu_pool`, ...
- `closer_profiles` : `id` (= auth user id), `full_name`, `role` ('admin'|'closer'), `essai_autorise boolean`, `exclu_commissions`.
- `digests_log` : `subscriber_id`, `date_digest`, `nb_leads`, `resend_id`.

### Le code existant à lire avant de commencer
- `site/app/api/sign-deal/route.js` (66 lignes) : la route à enrichir. Note `PLAN_PRICE`, `sendResend` local, la vérification `essai && !profile.essai_autorise`.
- `site/app/api/stripe-webhook/route.js` : `upsertFromSession` fait `upsert(row, { onConflict: "email" })`. C'est ce qui reliera plus tard la ligne créée par le dashboard à Stripe, **à condition que l'email soit le même**. Tu ne modifies pas ce fichier.
- `site/app/lib/geo.js` : `resolveZone(raw, plan)` retourne `{type:"region"|"departement", nom}` ou null.
- `site/app/closers/app/page.js` : `signDeal(prospect, planValue)` ligne ~205 envoie `{prospect_id, plan, essai}`. Le select Plan (ligne ~763) a les options `departemental_essai` / `regional_essai`.
- `pipeline/send_digests.py` : `plan_for_subscriber(s)` (pur) et `main()`. Les abonnés sont lus par `select * from subscribers where statut = 'actif'`.
- `pipeline/cron_github.py` : orchestre ingestion → enrichissement → `send_digests`. Lis-le pour voir où ajouter une étape.
- `pipeline/digest.py` : `send_resend(to, subject, html_body)` et `date_fr`.
- `pipeline/tests/` : suite existante (40 tests), `conftest.py` interdit le réseau. Tes nouveaux tests Python s'y ajoutent.

### Contraintes non négociables
- **Aucun secret dans le repo**, aucune valeur `sk_`, `rk_`, `whsec_`, token Supabase. Les tests mockent.
- Emails de transaction envoyés depuis `onboarding@lebonprospect.fr` (déjà utilisé par `sign-deal`), jamais depuis `alerte@` ni `contact@`.
- Copy : français, vouvoiement, couleur `#31777A`, pas de tiret cadratin, pas d'emoji dans les emails client (l'emoji existant dans l'email interne à Lawrenza est toléré, ne le touche pas).
- Le repo est **public** : rien de sensible dans les commits, les fixtures ou les commentaires.
- Le site n'a pas de framework de test JS installé. Tu en ajoutes un (tâche 1), **`vitest`** en devDependency, sans toucher au build Vercel (`next build` ne doit pas exécuter les tests).

## Fichiers autorisés

- Créer : `site/app/lib/essai.js`, `site/app/lib/essai.test.js`, `site/vitest.config.js`, `pipeline/remind_essais.py`, `pipeline/tests/test_remind_essais.py`, `pipeline/tests/test_send_digests_essai.py`, `pipeline/migrations/2026-09-24-essai-dashboard.sql`, `docs/essai-dashboard.md`
- Modifier : `site/app/api/sign-deal/route.js`, `site/app/closers/app/page.js` (message de confirmation uniquement, voir tâche 5), `site/package.json` (devDependency + script `test`), `pipeline/send_digests.py` (tâche 6), `pipeline/cron_github.py` (une ligne, tâche 7), `.github/workflows/test.yml` (ajout du job JS, tâche 1)
- Interdit : `site/app/api/stripe-webhook/route.js`, `site/app/api/essais/route.js`, `pipeline/digest.py`, `pipeline/outreach.py`, les workflows `cron-daily.yml` et `outreach-daily.yml`, tout le reste.

---

### Tâche 0 : lecture et migration SQL

**Objectif :** figer le contrat de données avant d'écrire du code.

Lis les fichiers listés ci-dessus. Puis crée `pipeline/migrations/2026-09-24-essai-dashboard.sql` :

```sql
-- Essai 7 jours activé depuis le dashboard (sans carte).
-- À exécuter à la main dans Supabase par l'utilisateur ; le pipeline ne l'applique pas.
alter table subscribers
  add column if not exists essai_source text,            -- 'dashboard' | 'stripe'
  add column if not exists essai_rappel_at timestamptz,  -- email J+5 envoyé
  add column if not exists essai_expire_at timestamptz;  -- coupé par le cron sans paiement
alter table prospects_pool
  add column if not exists subscriber_id bigint references subscribers(id);
```

Ajoute en tête de `docs/essai-dashboard.md` une section « Migration à appliquer » qui reprend ce SQL et dit explicitement que l'utilisateur doit l'exécuter avant de merger.

**Commit :** `feat(essai): migration colonnes essai dashboard (à appliquer à la main)`

---

### Tâche 1 : vitest dans `site/` + job CI

**Fichiers :**
- `site/package.json` : ajouter `"vitest": "^2.1.0"` dans `devDependencies` et `"test": "vitest run"` dans `scripts`. Ne touche à rien d'autre dans ce fichier.
- Créer `site/vitest.config.js` :
  ```js
  import { defineConfig } from "vitest/config";
  export default defineConfig({ test: { include: ["app/**/*.test.js"], environment: "node" } });
  ```
- `.github/workflows/test.yml` : ajouter un job `vitest` à côté du job `pytest` existant, déclenché sur les mêmes événements avec en plus le path `site/**` :
  ```yaml
    vitest:
      runs-on: ubuntu-latest
      timeout-minutes: 10
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with: { node-version: "20", cache: npm, cache-dependency-path: site/package-lock.json }
        - run: cd site && npm ci
        - run: cd site && npm test
  ```
  Ajoute `site/**` aux `paths` de `on.push` et `on.pull_request`.

**Vérification :** `cd site && npm i && npm test` → « No test files found » (exit 1, attendu tant que la tâche 2 n'existe pas) ou 0 test. `npm run build` doit toujours passer.

**Commit :** `ci: vitest sur site/`

---

### Tâche 2 : `lib/essai.js`, la logique pure de création d'un abonné d'essai

**Objectif :** transformer un prospect + un plan en ligne `subscribers`, sans réseau, testable.

**Créer `site/app/lib/essai.js`** :

```js
import { resolveZone } from "./geo";

export const ESSAI_JOURS = 7;

/** Construit la ligne subscribers pour un essai démarré depuis le dashboard.
 *  Retourne { row } ou { error } (jamais les deux). now = Date injectable pour les tests. */
export function buildEssaiSubscriber(prospect, plan, now = new Date()) {
  const email = (prospect.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) return { error: "Ce prospect n'a pas d'email : impossible de démarrer l'essai." };
  if (!["departemental", "regional"].includes(plan)) return { error: "L'essai n'existe qu'en Départemental ou Régional." };
  const zone = resolveZone(prospect.region || "", plan);
  if (!zone) return { error: `Zone non reconnue pour ce prospect (« ${prospect.region || ""} »).` };
  if (plan === "departemental" && zone.type !== "departement") return { error: "Plan Départemental mais la zone du prospect est une région : choisissez Régional." };
  const fin = new Date(now.getTime() + ESSAI_JOURS * 86400000);
  return {
    row: {
      email,
      nom: null,
      societe: prospect.societe || null,
      plan,
      verticales: ["chr"],
      regions: zone.type === "region" ? [zone.nom] : null,
      departements: zone.type === "departement" ? [zone.nom] : null,
      statut: "actif",
      essai: true,
      essai_fin: fin.toISOString(),
      essai_source: "dashboard",
      source: "dashboard_essai",
      telephone: prospect.telephone || null,
      secteur: prospect.categorie || null,
      zone_saisie: prospect.region || null,
    },
  };
}
```

Attention à `resolveZone(raw, "departemental")` : il cherche d'abord un **code** à deux chiffres dans la chaîne. `prospect.region` contient un libellé de région (ex. « Occitanie »), pas un département. Donc pour `plan = "departemental"`, `resolveZone` renverra une **région**, et `buildEssaiSubscriber` retournera l'erreur « choisissez Régional ». C'est voulu : le pool ne connaît pas le département du prospect. Documente-le dans `docs/essai-dashboard.md` (section « Limites ») : « l'essai Départemental depuis le dashboard n'est possible que si `prospects_pool.region` contient un département ou un code ; sinon utiliser Régional, ou passer par le Payment Link Stripe où le client saisit sa zone ».

**Créer `site/app/lib/essai.test.js`** :

```js
import { describe, it, expect } from "vitest";
import { buildEssaiSubscriber, ESSAI_JOURS } from "./essai";

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
```

**Vérification :** `cd site && npm test` → 7 tests PASS.

**Commit :** `feat(essai): buildEssaiSubscriber, logique pure et tests`

---

### Tâche 3 : `sign-deal` crée l'abonné quand `essai` est vrai

**Modifier `site/app/api/sign-deal/route.js`.** Après la vérification `essai && !profile.essai_autorise` et **avant** l'update de `prospects_pool`, ajouter :

```js
let subscriberId = null;
if (essai) {
  const { row, error: bErr } = buildEssaiSubscriber(prospect, plan);
  if (bErr) return Response.json({ error: bErr }, { status: 400 });
  // Un abonné payant ou déjà en essai ne doit jamais être écrasé par un essai.
  const { data: existing } = await admin.from("subscribers").select("id, essai, premier_paiement_at, statut").eq("email", row.email).maybeSingle();
  if (existing && (existing.premier_paiement_at || existing.statut === "actif")) {
    return Response.json({ error: "Cet email est déjà abonné (ou déjà en essai). Pas de nouvel essai." }, { status: 409 });
  }
  const { data: created, error: sErr } = await admin.from("subscribers").upsert(row, { onConflict: "email" }).select("id").single();
  if (sErr) return Response.json({ error: sErr.message }, { status: 400 });
  subscriberId = created.id;
}
```

Import en tête : `import { buildEssaiSubscriber } from "../../lib/essai";`

Puis dans l'`update` de `prospects_pool`, ajouter `subscriber_id: subscriberId` aux champs.

Dans l'email interne à Lawrenza (celui vers `belinlawrenza@gmail.com`), remplacer la ligne finale `Reste à activer l'abonnement Stripe côté client.` par, **uniquement quand `essai` est vrai** : `Essai démarré : premier digest demain 8h. Rappel carte automatique à J+5.` Sinon garder le texte actuel.

Ajouter à la réponse : `return Response.json({ ok: true, essai_demarre: essai, subscriber_id: subscriberId });`

**Test de la route** : pas de test HTTP (pas d'infra). La logique métier est couverte par `essai.test.js`. Ajoute en revanche dans `docs/essai-dashboard.md` un « Test manuel après déploiement » en 5 étapes : (1) sur le compte `essai_autorise`, choisir « Essai 7 j · Régional » sur un prospect qui a un email de test à toi ; (2) vérifier la ligne dans `subscribers` (essai=true, essai_source=dashboard, essai_fin à J+7) ; (3) lancer `python3 send_digests.py --dry-run`, l'email doit apparaître ; (4) vérifier que le panneau « Essais gratuits » du dashboard l'affiche « en cours » ; (5) supprimer la ligne de test.

**Vérification :** `cd site && npm run build` passe. `npm test` passe.

**Commit :** `feat(essai): sign-deal crée l'abonné d'essai en base`

---

### Tâche 4 : message de confirmation dans le dashboard

**Modifier `site/app/closers/app/page.js`**, fonction `signDeal` uniquement. Après la réponse de `/api/sign-deal` :
- si la réponse contient `error` : afficher l'erreur via le toast existant (regarde comment `useToast` est utilisé ailleurs dans le fichier) et **remettre le select à sa valeur précédente**.
- si `essai_demarre` est vrai : toast « Essai démarré. Premier digest demain 8h. » 
- sinon : comportement actuel inchangé.

Ne change ni les options du select, ni le panneau essais, ni le CSS.

**Vérification :** `npm run build` passe. Pas de test automatisé sur le composant (pas de jsdom installé, on ne l'ajoute pas).

**Commit :** `feat(essai): retour utilisateur dans le dashboard`

---

### Tâche 5 : `send_digests.py` ne sert plus un essai expiré

**Règle :** un abonné avec `essai = true`, `premier_paiement_at` null, et `essai_fin` dépassé de plus de **24 h** ne reçoit plus de digest, et sa ligne passe en `statut = 'pause'` avec `essai_expire_at = now()`. La marge de 24 h laisse le temps au webhook Stripe `invoice.paid` d'arriver quand la carte a été ajoutée le dernier jour.

**Modifier `pipeline/send_digests.py`** : ajouter au-dessus de `main()` une fonction pure :

```python
def essai_expire(s, now):
    """True si l'essai est terminé depuis plus de 24 h sans premier paiement."""
    if not s.get("essai") or s.get("premier_paiement_at"):
        return False
    fin = s.get("essai_fin")
    if not fin:
        return False
    fin_dt = datetime.datetime.fromisoformat(str(fin).replace("Z", "+00:00"))
    if fin_dt.tzinfo is None:
        fin_dt = fin_dt.replace(tzinfo=datetime.timezone.utc)
    return (now - fin_dt) > datetime.timedelta(hours=24)
```

Dans `main()`, dans la boucle sur `subs`, juste après le test `dernier_digest == today`, ajouter :

```python
        if essai_expire(s, datetime.datetime.now(datetime.timezone.utc)):
            if not args.dry_run:
                sql_exec(f"update subscribers set statut = 'pause', essai_expire_at = now() where id = {s['id']};")
            expired += 1
            print(f"ESSAI EXPIRÉ: {s['email']} (fin {s.get('essai_fin')})")
            continue
```

Initialiser `expired = 0` avec les autres compteurs et l'ajouter au `BILAN` final : `f"..., {expired} essais expirés"`.

**Créer `pipeline/tests/test_send_digests_essai.py`** :

```python
import datetime
import send_digests as sd

UTC = datetime.timezone.utc
NOW = datetime.datetime(2026, 9, 24, 6, 0, tzinfo=UTC)

def test_pas_essai():
    assert sd.essai_expire({"essai": False, "essai_fin": "2026-09-01T00:00:00Z"}, NOW) is False

def test_essai_paye_jamais_expire():
    assert sd.essai_expire({"essai": True, "essai_fin": "2026-09-01T00:00:00Z", "premier_paiement_at": "2026-09-08T00:00:00Z"}, NOW) is False

def test_essai_en_cours():
    assert sd.essai_expire({"essai": True, "essai_fin": "2026-09-30T00:00:00Z"}, NOW) is False

def test_essai_fini_depuis_moins_de_24h():
    assert sd.essai_expire({"essai": True, "essai_fin": "2026-09-23T10:00:00Z"}, NOW) is False

def test_essai_fini_depuis_plus_de_24h():
    assert sd.essai_expire({"essai": True, "essai_fin": "2026-09-22T10:00:00Z"}, NOW) is True

def test_essai_fin_naive_traitee_utc():
    assert sd.essai_expire({"essai": True, "essai_fin": "2026-09-22 10:00:00"}, NOW) is True

def test_main_dry_run_saute_essai_expire(fixture, monkeypatch, capsys):
    subs = fixture("subscribers.json")
    subs[0] = {**subs[0], "essai": True, "essai_fin": "2026-09-01T00:00:00Z"}
    updates = []
    def fake_sql(q):
        if "from subscribers" in q: return subs
        if "max(date_parution)" in q: return [{"d": "2026-09-23"}]
        updates.append(q); return []
    monkeypatch.setattr(sd, "sql_exec", fake_sql)
    monkeypatch.setattr(sd, "fetch_leads", lambda *a, **k: [{"acheteur_nom": "X", "ville": "V", "departement": "D"}])
    monkeypatch.setattr(sd, "send_resend", lambda *a, **k: (_ for _ in ()).throw(AssertionError("interdit")))
    monkeypatch.setattr("sys.argv", ["send_digests.py", "--dry-run"])
    class FD(datetime.date):
        @classmethod
        def today(cls): return cls(2026, 9, 24)
    monkeypatch.setattr(sd.datetime, "date", FD)
    sd.main()
    out = capsys.readouterr().out
    assert "ESSAI EXPIRÉ: regional@example.com" in out
    assert "1 essais expirés" in out
    assert updates == []   # dry-run : aucun update
```

Attention : le test existant `test_main_dry_run_saute_deja_servi` dans `test_send_digests.py` vérifie une chaîne de BILAN ; si tu modifies le format du BILAN, adapte ce test **sans en affaiblir l'assertion**. Si `monkeypatch.setattr(sd.datetime, "date", FD)` casse `datetime.datetime.now` dans `essai_expire` (parce que `sd.datetime` est le module), vérifie en lançant le test : `datetime.datetime` n'est pas touché par le patch de `datetime.date`, ça doit passer.

**Vérification :** `cd pipeline && python3 -m pytest -v` → 47+ tests PASS.

**Commit :** `feat(essai): send_digests coupe les essais expirés sans paiement`

---

### Tâche 6 : rappel J+5, `remind_essais.py`

**Objectif :** à J+5 (deux jours avant la fin), un email au client : « votre essai se termine dans deux jours, ajoutez votre carte pour continuer », avec le Payment Link Stripe **du même plan**, et le rappel que Lawrenza l'appelle.

**Créer `pipeline/remind_essais.py`** :

```python
#!/usr/bin/env python3
"""LeBonProspect : rappel J+5 aux essais gratuits démarrés depuis le dashboard.
Appelé par le cron après send_digests. Un seul rappel par abonné (essai_rappel_at).
Usage: python3 remind_essais.py [--dry-run]
"""
import os, sys, argparse, datetime, html

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from load_db import sql_exec
from digest import date_fr

# Payment Links essai (carte obligatoire, 7 jours) : voir docs/essai-dashboard.md
LINKS = {
    "departemental": "https://buy.stripe.com/8x26oHffzaSEc9faPL8N203",
    "regional": "https://buy.stripe.com/00w7sLc3nbWI7SZcXT8N204",
}
TEAL = "#31777A"

def a_rappeler(s, now):
    """Essai dashboard, non payé, non rappelé, dont la fin est dans moins de 48 h (et pas encore passée)."""
    if not s.get("essai") or s.get("essai_source") != "dashboard":
        return False
    if s.get("premier_paiement_at") or s.get("essai_rappel_at"):
        return False
    fin = s.get("essai_fin")
    if not fin:
        return False
    fin_dt = datetime.datetime.fromisoformat(str(fin).replace("Z", "+00:00"))
    if fin_dt.tzinfo is None:
        fin_dt = fin_dt.replace(tzinfo=datetime.timezone.utc)
    reste = fin_dt - now
    return datetime.timedelta(0) < reste <= datetime.timedelta(hours=48)

def render_rappel(s):
    plan = s.get("plan") or "regional"
    link = LINKS.get(plan, LINKS["regional"])
    prix = "149" if plan == "departemental" else "299"
    fin = date_fr(str(s.get("essai_fin"))[:10])
    societe = html.escape(s.get("societe") or "")
    return f"""<!doctype html><html lang="fr"><body style="margin:0;padding:0;background:#ffffff;" bgcolor="#ffffff">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;font-family:Arial,Helvetica,sans-serif;color:#14181d;">
<tr><td style="font-size:20px;font-weight:bold;padding-bottom:12px;">Votre essai se termine le {fin}</td></tr>
<tr><td style="font-size:15px;line-height:1.55;padding-bottom:16px;">
Bonjour,<br><br>
Depuis cinq jours, vous recevez chaque matin les reprises de commerces de votre zone{(" pour " + societe) if societe else ""}.
Pour continuer à les recevoir après le {fin}, il suffit d'ajouter votre carte : l'abonnement démarre au tarif normal, {prix} € par mois, sans engagement.
</td></tr>
<tr><td style="padding:6px 0 22px;"><a href="{link}" style="display:inline-block;background:{TEAL};color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px;font-size:15px;">Continuer à recevoir les reprises</a></td></tr>
<tr><td style="font-size:14px;line-height:1.55;color:#6f6a5c;">
Une question, une zone à ajuster ? Répondez à cet email, ou attendez l'appel de Lawrenza dans les prochains jours.<br><br>
Sans carte au {fin}, les envois s'arrêtent, sans frais et sans rien à faire de votre côté.
</td></tr>
</table></td></tr></table></body></html>"""

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    now = datetime.datetime.now(datetime.timezone.utc)
    subs = sql_exec("select * from subscribers where essai = true and premier_paiement_at is null and essai_rappel_at is null;")
    n = 0
    for s in subs or []:
        if not a_rappeler(s, now):
            continue
        subject = f"Votre essai LeBonProspect se termine le {date_fr(str(s.get('essai_fin'))[:10])}"
        if args.dry_run:
            print(f"DRY: rappel → {s['email']} ({s.get('plan')})")
            n += 1
            continue
        try:
            send_transactional(s["email"], subject, render_rappel(s))
            sql_exec(f"update subscribers set essai_rappel_at = now() where id = {s['id']};")
            print(f"OK: rappel → {s['email']}")
            n += 1
        except Exception as e:
            print(f"ERREUR rappel {s['email']}: {e}", file=sys.stderr)
    print(f"BILAN rappels: {n}")

if __name__ == "__main__":
    main()
```

**Expéditeur, vérifié :** `digest.send_resend` envoie depuis `alerte@lebonprospect.fr` (le domaine de digest, à protéger). Un email transactionnel ne doit pas partir de là. Donc **n'importe pas `send_resend`** : écris dans `remind_essais.py` une fonction `send_transactional(to, subject, html_body)`, copie de `send_resend` (même appel Resend, même lecture de `RESEND_API_KEY` via `load_db.env`) avec `"from": "LeBonProspect <onboarding@lebonprospect.fr>"`, et utilise-la dans `main()`. Adapte le monkeypatch du test `test_main_dry_run` en conséquence (`re_.send_transactional`).

**Créer `pipeline/tests/test_remind_essais.py`** :

```python
import datetime
import remind_essais as re_

UTC = datetime.timezone.utc
NOW = datetime.datetime(2026, 9, 24, 6, 0, tzinfo=UTC)
BASE = {"essai": True, "essai_source": "dashboard", "plan": "regional", "email": "x@example.com"}

def test_rappel_dans_la_fenetre():
    assert re_.a_rappeler({**BASE, "essai_fin": "2026-09-25T18:00:00Z"}, NOW) is True

def test_pas_de_rappel_trop_tot():
    assert re_.a_rappeler({**BASE, "essai_fin": "2026-09-28T00:00:00Z"}, NOW) is False

def test_pas_de_rappel_essai_fini():
    assert re_.a_rappeler({**BASE, "essai_fin": "2026-09-23T00:00:00Z"}, NOW) is False

def test_pas_de_rappel_si_deja_rappele_ou_paye():
    assert re_.a_rappeler({**BASE, "essai_fin": "2026-09-25T18:00:00Z", "essai_rappel_at": "2026-09-24T00:00:00Z"}, NOW) is False
    assert re_.a_rappeler({**BASE, "essai_fin": "2026-09-25T18:00:00Z", "premier_paiement_at": "2026-09-24T00:00:00Z"}, NOW) is False

def test_pas_de_rappel_essai_stripe():
    """Les essais Stripe reçoivent déjà le rappel J-3 natif de Stripe."""
    assert re_.a_rappeler({**BASE, "essai_source": "stripe", "essai_fin": "2026-09-25T18:00:00Z"}, NOW) is False

def test_render_rappel_lien_et_prix():
    h = re_.render_rappel({**BASE, "essai_fin": "2026-09-26T00:00:00Z", "societe": "AGENCEMENT <TEST>"})
    assert re_.LINKS["regional"] in h and "299" in h
    assert "26 septembre 2026" in h
    assert "&lt;TEST&gt;" in h and "<TEST>" not in h
    assert 'bgcolor="#ffffff"' in h
    h2 = re_.render_rappel({**BASE, "plan": "departemental", "essai_fin": "2026-09-26T00:00:00Z"})
    assert re_.LINKS["departemental"] in h2 and "149" in h2

def test_main_dry_run(monkeypatch, capsys):
    subs = [{**BASE, "id": 1, "essai_fin": "2026-09-25T18:00:00Z"}, {**BASE, "id": 2, "email": "y@example.com", "essai_fin": "2026-10-10T00:00:00Z"}]
    updates = []
    monkeypatch.setattr(re_, "sql_exec", lambda q: subs if q.strip().startswith("select") else updates.append(q))
    monkeypatch.setattr(re_, "send_transactional", lambda *a, **k: (_ for _ in ()).throw(AssertionError("interdit")))
    class FDT(datetime.datetime):
        @classmethod
        def now(cls, tz=None): return NOW
    monkeypatch.setattr(re_.datetime, "datetime", FDT)
    monkeypatch.setattr("sys.argv", ["remind_essais.py", "--dry-run"])
    re_.main()
    out = capsys.readouterr().out
    assert "DRY: rappel → x@example.com" in out and "y@example.com" not in out
    assert "BILAN rappels: 1" in out and updates == []
```

Si tu as créé `send_transactional`, adapte le monkeypatch du dernier test.

**Vérification :** `cd pipeline && python3 -m pytest -v` → tout PASS.

**Commit :** `feat(essai): rappel J+5 par email avec lien Stripe`

---

### Tâche 7 : brancher le rappel dans le cron

**Modifier `pipeline/cron_github.py`** : après l'appel à `send_digests`, ajouter l'exécution de `remind_essais.py` de la même manière que les autres étapes (regarde comment le fichier lance `send_digests`, subprocess ou import, et fais pareil). Une erreur dans le rappel ne doit **pas** faire échouer le cron : entoure d'un try/except qui logge.

**Vérification :** `python3 -c "import ast; ast.parse(open('pipeline/cron_github.py').read())"` passe. Pas de test d'intégration possible sans secrets ; décris dans la PR comment l'utilisateur vérifie le lendemain dans les logs GitHub Actions (`BILAN rappels: 0` attendu s'il n'y a aucun essai).

**Commit :** `feat(essai): rappel J+5 dans le cron quotidien`

---

### Tâche 8 : documentation

Compléter `docs/essai-dashboard.md` avec : le parcours complet (J0 dashboard → J1 premier digest → J5 rappel email + appel Law → J7 fin → J8 coupure sans paiement), la migration, le test manuel, les limites (Départemental depuis le pool, voir tâche 2), et le lien avec le webhook Stripe (« quand le client paie via le Payment Link avec le même email, `upsertFromSession` écrase la ligne d'essai : `stripe_subscription_id` est renseigné, puis `invoice.paid` pose `premier_paiement_at` ; l'essai devient « converti » dans le panneau »). Signale explicitement le risque : **si le client saisit un autre email sur Stripe**, une seconde ligne est créée et la première finira en `pause` à J+8. Lawrenza doit demander au client d'utiliser le même email.

**Commit :** `docs: essai dashboard, parcours, migration, limites`

---

## Critères de fin (à vérifier avant d'ouvrir la PR)

- [ ] `cd pipeline && python3 -m pytest -v` : tous PASS sans variable d'environnement.
- [ ] `cd site && npm test` : tous PASS. `npm run build` : passe.
- [ ] `git diff main --stat` : uniquement les fichiers de la liste autorisée. `stripe-webhook/route.js`, `essais/route.js`, `digest.py` **inchangés**.
- [ ] `grep -rnE "sk_live|rk_live|whsec_|eyJhbGci" .` ne retourne rien.
- [ ] Les deux jobs CI (`pytest`, `vitest`) verts sur la branche.
- [ ] La description de la PR contient : la migration SQL à appliquer **avant** merge (en évidence, en haut), le nombre de tests, les URL des runs CI, la section « Test manuel après déploiement », et une section « Observations » (au minimum : l'expéditeur de `send_resend` et ce que tu as fait, la limite Départemental, tout écart avec ce plan).

## Hors périmètre (ne pas faire)

- Modifier le webhook Stripe, le panneau essais existant, les Payment Links.
- Ajouter un rappel J+7 ou une relance multiple : un seul email, Lawrenza fait le reste par téléphone.
- Créer un client Stripe ou un abonnement depuis le dashboard : la carte se saisit sur le Payment Link, point.
- Toucher au copy des pages publiques.
