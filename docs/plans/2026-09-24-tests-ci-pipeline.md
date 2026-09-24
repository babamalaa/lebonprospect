# Plan 1 : Tests + CI du pipeline LeBonProspect

> **Pour l'agent qui exécute (Claude Code cloud) :** exécute ce plan tâche par tâche, dans l'ordre, en committant après chaque tâche. Ouvre une PR unique nommée `test: suite de tests pipeline + CI` vers `main`. Ne modifie AUCUN fichier hors de la liste « Fichiers autorisés ». Ne touche jamais à `site/`, aux workflows `cron-daily.yml` et `outreach-daily.yml`, ni aux scripts qui envoient des emails.

**Objectif :** couvrir par des tests unitaires, sans réseau et sans secret, les fonctions pures du pipeline (parsing BODACC, classification NAF, rendu du digest, logique Places, filtrage des abonnés), et faire tourner ces tests dans GitHub Actions à chaque push et PR.

**Architecture :** `pytest` + fixtures JSON anonymisées versionnées dans `pipeline/tests/fixtures/`. Aucun appel réseau : les fonctions qui font du réseau (`http_json`, `sql_exec`, `send_resend`, `places_search`) sont soit non testées, soit remplacées par `monkeypatch`. Un seul workflow CI, `test.yml`, indépendant des crons de production.

**Stack :** Python 3.12, pytest, stdlib uniquement (le pipeline n'a aucune dépendance tierce, on n'en ajoute pas hors pytest).

---

## Contexte que tu dois connaître

- Code du pipeline : `pipeline/*.py`, 19 scripts, stdlib uniquement. Modules ciblés : `ingest.py`, `digest.py`, `enrich_places.py`, `send_digests.py`, `load_db.py`.
- `pipeline/load_db.py` expose `env(key)` qui fait `sys.exit` si la clé manque, et `sql_exec(query)` qui appelle l'API Supabase. `digest.py` et `send_digests.py` importent ces deux fonctions au niveau module : **importer `digest` ne déclenche aucun appel réseau** tant qu'on n'appelle pas `fetch_leads`/`send_resend`. Vérifie-le en début de tâche 2 avec `python3 -c "import sys; sys.path.insert(0,'pipeline'); import digest"`.
- `data/` est dans `.gitignore` : il n'existe **aucune donnée** dans le repo cloné. Tu dois créer des fixtures synthétiques (voir tâche 1). Elles doivent ressembler au format réel décrit ci-dessous, mais avec des noms, SIREN et téléphones **fictifs**. Aucune donnée personnelle réelle ne doit entrer dans le repo.
- Format d'une ligne BODACC brute (entrée de `process_day`, sortie de `fetch_day`) : dict avec clés `id, dateparution, typeavis_lib, commercant, ville, cp, registre (liste de SIREN str), tribunal, listepersonnes (JSON string {"personne": {...} ou [{...}]}), acte (JSON string {"descriptif": "..."}), departement_nom_officiel, region_nom_officiel`.
- Format d'un lead en base (entrée de `lead_block` et `render_digest`) : dict avec clés `acheteur_nom, commercant, ville, departement, acheteur_dirigeants (liste ou str postgres "{A,B}"), acheteur_adresse, telephone, acheteur_date_creation (ISO)`.
- Format d'un abonné (`send_digests.py`) : dict avec `id, email, statut, verticales, regions, departements, villes, zone_label, dernier_digest`. Les champs listes arrivent parfois comme str postgres `"{chr,alimentaire}"`.
- Conventions du repo : commits en français, préfixe court (`test:`, `ci:`, `refactor:`), pas de tiret cadratin, pas d'emoji.

## Fichiers autorisés

- Créer : `pipeline/tests/__init__.py`, `pipeline/tests/conftest.py`, `pipeline/tests/fixtures/*.json`, `pipeline/tests/test_*.py`, `pipeline/pytest.ini`, `pipeline/requirements-dev.txt`, `.github/workflows/test.yml`
- Modifier (refactor minimal, sans changer le comportement) : `pipeline/send_digests.py` (tâche 6 uniquement), `pipeline/digest.py` (tâche 4, une fonction extraite)
- Interdit : tout le reste.

---

### Tâche 0 : squelette pytest

**Objectif :** pytest tourne et trouve le dossier de tests.

**Fichiers :**
- Créer `pipeline/requirements-dev.txt` :
  ```
  pytest==8.3.3
  ```
- Créer `pipeline/pytest.ini` :
  ```ini
  [pytest]
  testpaths = tests
  pythonpath = .
  addopts = -q
  ```
- Créer `pipeline/tests/__init__.py` (vide).
- Créer `pipeline/tests/conftest.py` :
  ```python
  import json, os, pytest

  FIX = os.path.join(os.path.dirname(__file__), "fixtures")

  def load_fixture(name):
      with open(os.path.join(FIX, name), encoding="utf-8") as f:
          return json.load(f)

  @pytest.fixture
  def fixture():
      return load_fixture

  @pytest.fixture(autouse=True)
  def no_network(monkeypatch):
      """Tout appel réseau dans un test est une erreur."""
      import urllib.request
      def boom(*a, **k):
          raise RuntimeError("Appel réseau interdit dans les tests")
      monkeypatch.setattr(urllib.request, "urlopen", boom)
  ```

**Vérification :** `cd pipeline && pip install -r requirements-dev.txt && python3 -m pytest` → `no tests ran` (exit 5, c'est attendu).

**Commit :** `test: squelette pytest, réseau interdit dans les tests`

---

### Tâche 1 : fixtures synthétiques

**Objectif :** des données d'entrée réalistes et fictives, réutilisées par toutes les tâches.

**Créer `pipeline/tests/fixtures/bodacc_rows.json`** : liste de 4 lignes BODACC brutes.
1. Un restaurant (NAF vendeur 56.10A) avec `listepersonnes` contenant **une seule** personne (dict, pas liste), `registre` = `["123456789", "987654321"]`, acheteur SIREN `123456789`.
2. Une laverie (NAF 96.01B) avec `listepersonnes` contenant **une liste de deux** personnes, dont une personne physique (`typePersonne: "pp"`, `prenom`, `nom`, sans `denomination`).
3. Une ligne avec `listepersonnes` = `null` et `registre` = `[]` (cas dégradé : aucun SIREN).
4. Une ligne dont `acte` est une chaîne JSON invalide (`"{pas du json"`), et dont `denomination` est une **liste** `["CAFE", "DU CENTRE"]` (le cas `_flat` sur liste).

Champs `commercant`, `ville`, `cp`, `departement_nom_officiel`, `region_nom_officiel` remplis avec des valeurs plausibles et fictives (ex. `"LE BISTROT TEST"`, `"Villeneuve-Test"`, `"Rhône"`, `"Auvergne-Rhône-Alpes"`). Téléphones : jamais.

**Créer `pipeline/tests/fixtures/siren_cache.json`** : dict `{siren: info}` pour les SIREN des fixtures, au format retourné par `enrich_siren` : `{"naf": "56.10A", "nom_complet": "...", "date_creation": "2026-06-01", "dirigeants": ["PRENOM NOM"], "siege_adresse": "..."}`. Inclure un SIREN dont `naf` vaut `"00.00Z"` (cas où on doit retomber sur le NAF de l'acheteur) et un SIREN absent du cache (valeur `null`).

**Créer `pipeline/tests/fixtures/leads.json`** : liste de 5 leads « en base » :
1. Complet : nom, ville, dept, 2 dirigeants en liste, adresse, téléphone `"04 00 00 00 00"`, `acheteur_date_creation` à J-30 (société neuve).
2. Sans téléphone (`null`), création il y a 5 ans.
3. `acheteur_dirigeants` en str postgres `"{JEAN TEST (Nom d'usage),MARIE TEST}"`.
4. `acheteur_nom` null, `commercant` rempli.
5. Même département que le lead 1, pour tester le regroupement.

Pour la date « J-30 », utilise une date fixe (`"2026-09-01"`) et dans les tests compare avec une date figée via `monkeypatch` de `datetime.date.today` (voir tâche 4). Ne dépends jamais de la date réelle.

**Créer `pipeline/tests/fixtures/subscribers.json`** : liste de 5 abonnés :
1. régional : `regions: ["Occitanie"]`, `verticales: ["chr"]`, `dernier_digest: null`
2. déjà servi aujourd'hui : `dernier_digest: "2026-09-24"`
3. départemental multi : `departements: "{Rhône,Isère}"` (str postgres), `verticales: "{chr,alimentaire}"`
4. zone sur mesure : `villes: "{\"Toulon\",\"La Seyne-sur-Mer\"}"`, `departements: ["Var"]`, `zone_label: "Toulon + 10 km"`, `verticales: ["tous"]`
5. national : aucune zone

**Vérification :** `python3 -c "import json,glob; [json.load(open(f)) for f in glob.glob('pipeline/tests/fixtures/*.json')]"` → aucune erreur.

**Commit :** `test: fixtures synthétiques BODACC, leads, abonnés`

---

### Tâche 2 : tests `ingest.py` (fonctions pures)

**Fichier :** `pipeline/tests/test_ingest.py`

Tests à écrire (un par fonction, nommés explicitement) :

```python
import json, pytest
import ingest

def test_classify_chr():
    assert ingest.classify("56.10A") == "chr"

def test_classify_prefixe_court():
    assert ingest.classify("47.21Z") == "alimentaire"   # préfixe "47.2"

def test_classify_vide_et_inconnu():
    assert ingest.classify("") == "inconnu"
    assert ingest.classify(None) == "inconnu"
    assert ingest.classify("99.99Z") == "autres"

def test_clean_siren():
    assert ingest.clean_siren("123 456 789") == "123456789"
    assert ingest.clean_siren("12345678901234") == "123456789"  # SIRET tronqué
    assert ingest.clean_siren("12345") is None
    assert ingest.clean_siren(None) is None

def test_parse_personnes_dict_et_liste(fixture):
    rows = fixture("bodacc_rows.json")
    assert len(ingest.parse_personnes(rows[0]["listepersonnes"])) == 1
    assert len(ingest.parse_personnes(rows[1]["listepersonnes"])) == 2
    assert ingest.parse_personnes(None) == []
    assert ingest.parse_personnes("{pas du json") == []

def test_flat():
    assert ingest._flat(["CAFE", "DU CENTRE"]) == "CAFE DU CENTRE"
    assert ingest._flat({"a": "X", "b": None}) == "X"
    assert ingest._flat(None) is None

def test_person_summary_personne_physique(fixture):
    rows = fixture("bodacc_rows.json")
    pp = [p for p in ingest.parse_personnes(rows[1]["listepersonnes"]) if p["typePersonne"] == "pp"][0]
    s = ingest.person_summary(pp)
    assert s["denomination"]  # prénom + nom
    assert s["type"] == "pp"
```

Puis `process_day` **sans réseau** : monkeypatch `ingest.fetch_day` pour retourner les fixtures, et `ingest.enrich_siren` pour lire `siren_cache.json` :

```python
def test_process_day_sans_reseau(fixture, monkeypatch):
    rows = fixture("bodacc_rows.json")
    cache = fixture("siren_cache.json")
    monkeypatch.setattr(ingest, "fetch_day", lambda day: rows)
    monkeypatch.setattr(ingest, "enrich_siren", lambda siren, c: cache.get(siren))
    out = ingest.process_day("2026-09-23")
    assert len(out) == 4
    r0 = out[0]
    assert r0["acheteur_siren"] == "123456789"
    assert r0["vendeur_siren"] == "987654321"
    assert r0["verticale"] == "chr"
    # ligne 3 : aucun SIREN, aucune personne
    assert out[2]["acheteur_siren"] is None and out[2]["vendeur_siren"] is None
    # ligne 4 : acte invalide → acte_descriptif None, denomination liste aplatie
    assert out[3]["acte_descriptif"] is None
    assert "CAFE DU CENTRE" in json.dumps(out[3]["personnes"])

def test_process_day_naf_fallback_acheteur(fixture, monkeypatch):
    """Si le NAF vendeur est 00.00Z, on prend celui de l'acheteur."""
    ...  # construis le cas à partir des fixtures : vendeur → "00.00Z", acheteur → "56.10A", attends verticale == "chr"
```

**Vérification :** `cd pipeline && python3 -m pytest tests/test_ingest.py -v` → tous PASS. Si un test échoue parce que le code réel se comporte autrement que ce que le plan suppose, **c'est le test qu'on adapte au comportement réel** (documente-le dans le message de commit), pas le code de production.

**Commit :** `test: ingest (classify, parse, process_day sans réseau)`

---

### Tâche 3 : tests `enrich_places.py` (fonctions pures)

**Fichier :** `pipeline/tests/test_enrich_places.py`

```python
import enrich_places as ep

def test_confiance_fixe():
    for t in ["01 23 45 67 89", "0423456789", "05 00 00 00 00", "09 70 00 00 00"]:
        assert ep.confiance(t) == "fixe_etablissement"

def test_confiance_mobile():
    for t in ["06 12 34 56 78", "07 00 00 00 00"]:
        assert ep.confiance(t) == "mobile"

def test_best_query_prefere_vendeur_puis_commercant():
    assert ep.best_query({"vendeur_nom": "LE BISTROT", "ville": "Lyon 3e"}) == "LE BISTROT Lyon 3e"
    assert ep.best_query({"commercant": "LAVERIE X, PARNASSA", "ville": "Marseille, 13005"}) == "LAVERIE X Marseille"

def test_best_query_avec_adresse():
    q = ep.best_query({"vendeur_nom": "LE BISTROT", "ville": "Lyon", "acheteur_adresse": "12 RUE TEST 69003 LYON"})
    assert q == "LE BISTROT 12 RUE TEST 69003 LYON"
```

Attention : `confiance` utilise la regex `^0[1-5,9]` ; la virgule dans la classe est un bug latent (elle matche aussi `0,`), ne le corrige pas, teste juste les cas réels. Note-le dans la PR comme observation.

**Vérification :** `python3 -m pytest tests/test_enrich_places.py -v` → PASS.

**Commit :** `test: enrich_places (confiance, best_query)`

---

### Tâche 4 : tests du rendu digest

**Fichier :** `pipeline/tests/test_digest.py`

Préalable : `lead_block` calcule l'âge de la société avec `datetime.date.today()`. Pour figer la date, monkeypatch la classe :

```python
import datetime, pytest
import digest

class FakeDate(datetime.date):
    @classmethod
    def today(cls):
        return cls(2026, 9, 24)

@pytest.fixture(autouse=True)
def freeze_today(monkeypatch):
    monkeypatch.setattr(digest.datetime, "date", FakeDate)
```

Tests :

```python
def test_date_fr():
    assert digest.date_fr("2026-09-23") == "23 septembre 2026"

def test_lead_block_complet(fixture):
    leads = fixture("leads.json")
    h = digest.lead_block(leads[0])
    assert "04 00 00 00 00" in h
    assert 'href="tel:0400000000"' in h
    assert "budgets ouverts" in h          # création à J-30
    assert leads[0]["ville"] in h

def test_lead_block_sans_telephone(fixture):
    h = digest.lead_block(fixture("leads.json")[1])
    assert "bientôt disponible" in h
    assert "en expansion" in h

def test_lead_block_dirigeants_postgres_et_nom_usage(fixture):
    h = digest.lead_block(fixture("leads.json")[2])
    assert "Nom d'usage" not in h
    assert "Jean Test" in h and "Marie Test" in h   # .title()

def test_lead_block_fallback_commercant(fixture):
    lead = fixture("leads.json")[3]
    assert lead["commercant"] in digest.lead_block(lead)

def test_lead_block_echappe_html():
    h = digest.lead_block({"acheteur_nom": "<script>x</script>", "ville": "A", "departement": "B"})
    assert "<script>" not in h and "&lt;script&gt;" in h

def test_render_digest_regroupe_par_departement(fixture):
    leads = fixture("leads.json")
    h = digest.render_digest("chr", leads, region="Auvergne-Rhône-Alpes", date="2026-09-23")
    assert "5 commerces viennent de changer de mains" in h
    assert h.count("reprise") >= 2
    dept1 = leads[0]["departement"].upper()
    assert f"{dept1} · 2 reprises" in h        # leads 1 et 5 même département
    assert 'bgcolor="#ffffff"' in h            # règle mode sombre Apple Mail
    assert "23 septembre 2026" in h

def test_render_digest_singulier():
    h = digest.render_digest("chr", [{"acheteur_nom": "X", "ville": "V", "departement": "D"}], date="2026-09-23")
    assert "1 commerce vient" not in h or "1 commerce viennent" in h  # documente le comportement réel du pluriel

def test_render_digest_zone_label():
    h = digest.render_digest("tous", [], date="2026-09-23", zone_label="Toulon + 10 km")
    assert "Toulon + 10 km" in h and "tous commerces" in h
```

Sur `test_render_digest_singulier` : le code actuel produit « 1 commerce viennent » (le verbe n'est pas accordé). Écris le test de façon à **figer le comportement actuel** et ajoute une ligne « Observation » dans la PR. Ne corrige pas le texte, c'est une décision copy de l'utilisateur.

**Vérification :** `python3 -m pytest tests/test_digest.py -v` → PASS.

**Commit :** `test: rendu digest (lead_block, render_digest, date figée)`

---

### Tâche 5 : `fetch_leads` construit le bon SQL

**Fichier :** `pipeline/tests/test_digest_sql.py`

`fetch_leads` appelle `sql_exec(q)`. On capture la requête :

```python
import digest

def capture(monkeypatch):
    seen = {}
    monkeypatch.setattr(digest, "sql_exec", lambda q: seen.setdefault("q", q) or [])
    return seen

def test_fetch_leads_verticale_region(monkeypatch):
    seen = capture(monkeypatch)
    digest.fetch_leads("chr", region="Provence-Alpes-Côte d'Azur", date="2026-09-23")
    q = seen["q"]
    assert "verticale = 'chr'" in q
    assert "region = 'Provence-Alpes-Côte d''Azur'" in q     # apostrophe doublée
    assert "date_parution = '2026-09-23'" in q

def test_fetch_leads_tous_sans_filtre_verticale(monkeypatch):
    seen = capture(monkeypatch)
    digest.fetch_leads("tous", villes=["Toulon", "La Seyne-sur-Mer"], departement="Var", date="2026-09-23")
    q = seen["q"]
    assert "verticale =" not in q
    assert "split_part(ville, ',', 1) in ('Toulon','La Seyne-sur-Mer')" in q
    assert "departement = 'Var'" in q

def test_fetch_leads_sans_date_prend_max(monkeypatch):
    seen = capture(monkeypatch)
    digest.fetch_leads("chr")
    assert "select max(date_parution)" in seen["q"]

def test_fetch_leads_ville_avec_apostrophe(monkeypatch):
    seen = capture(monkeypatch)
    digest.fetch_leads("chr", villes=["L'Isle-sur-la-Sorgue"])
    assert "'L''Isle-sur-la-Sorgue'" in seen["q"]
```

**Commit :** `test: fetch_leads, construction SQL et échappement`

---

### Tâche 6 : extraire et tester la logique abonné de `send_digests.py`

**Objectif :** la boucle de `send_digests.main()` mélange parsing des champs postgres, choix de la zone et envoi. On extrait la partie pure dans une fonction, sans changer le comportement.

**Modifier `pipeline/send_digests.py`** : ajouter, au-dessus de `main()`, deux fonctions et faire appeler `main()` par elles. Comportement identique à l'existant, ligne pour ligne :

```python
def _as_list(v):
    """Champ Supabase liste : déjà une liste, ou str postgres '{a,b}' / '{"a b","c"}'."""
    if not v:
        return []
    if isinstance(v, str):
        return [x.strip().strip('"') for x in v.strip("{}").split(",") if x.strip()]
    return list(v)

def plan_for_subscriber(s):
    """Retourne (verticales, regions, depts, villes, zone) pour un abonné, sans réseau."""
    verticales = _as_list(s.get("verticales")) or ["chr"]
    regions = _as_list(s.get("regions"))
    depts = _as_list(s.get("departements"))
    villes = _as_list(s.get("villes"))
    zone = (s.get("zone_label") or (villes[0] + " et alentours" if villes else None)) \
           or (", ".join(regions) if regions else (", ".join(depts) if depts else "France entière"))
    return verticales, regions, depts, villes, zone
```

Puis dans `main()`, remplacer le bloc de parsing (les `if isinstance(..., str)` et le calcul de `zone`) par `verticales, regions, depts, villes, zone = plan_for_subscriber(s)`. Le reste de la boucle (appels `fetch_leads`, `render_digest`, `send_resend`, SQL) **ne change pas**.

Attention à une différence subtile : l'ancien code strippait les guillemets uniquement pour `villes` (`.strip('"')`). `_as_list` le fait pour tous les champs ; c'est sans effet sur `verticales/regions/departements` (jamais de guillemets), donc acceptable. Mentionne-le dans la PR.

**Fichier :** `pipeline/tests/test_send_digests.py`

```python
import send_digests as sd

def test_as_list():
    assert sd._as_list(None) == []
    assert sd._as_list(["a"]) == ["a"]
    assert sd._as_list("{chr,alimentaire}") == ["chr", "alimentaire"]
    assert sd._as_list('{"Toulon","La Seyne-sur-Mer"}') == ["Toulon", "La Seyne-sur-Mer"]

def test_plan_regional(fixture):
    v, r, d, vi, zone = sd.plan_for_subscriber(fixture("subscribers.json")[0])
    assert v == ["chr"] and r == ["Occitanie"] and zone == "Occitanie"

def test_plan_departemental_multi_str_postgres(fixture):
    v, r, d, vi, zone = sd.plan_for_subscriber(fixture("subscribers.json")[2])
    assert v == ["chr", "alimentaire"] and d == ["Rhône", "Isère"] and zone == "Rhône, Isère"

def test_plan_zone_sur_mesure(fixture):
    v, r, d, vi, zone = sd.plan_for_subscriber(fixture("subscribers.json")[3])
    assert vi == ["Toulon", "La Seyne-sur-Mer"] and zone == "Toulon + 10 km" and v == ["tous"]

def test_plan_national(fixture):
    *_, zone = sd.plan_for_subscriber(fixture("subscribers.json")[4])
    assert zone == "France entière"

def test_plan_verticale_par_defaut():
    v, *_ = sd.plan_for_subscriber({"email": "x@y.fr"})
    assert v == ["chr"]
```

Et un test d'intégration de `main()` en dry-run, entièrement mocké :

```python
def test_main_dry_run_saute_deja_servi(fixture, monkeypatch, capsys):
    subs = fixture("subscribers.json")
    calls = []
    def fake_sql(q):
        if "from subscribers" in q: return subs
        if "max(date_parution)" in q: return [{"d": "2026-09-23"}]
        calls.append(q); return []
    monkeypatch.setattr(sd, "sql_exec", fake_sql)
    monkeypatch.setattr(sd, "fetch_leads", lambda *a, **k: [{"acheteur_nom": "X", "ville": "V", "departement": "D"}])
    monkeypatch.setattr(sd, "send_resend", lambda *a, **k: (_ for _ in ()).throw(AssertionError("envoi interdit en dry-run")))
    monkeypatch.setattr("sys.argv", ["send_digests.py", "--dry-run"])
    import datetime
    class FD(datetime.date):
        @classmethod
        def today(cls): return cls(2026, 9, 24)
    monkeypatch.setattr(sd.datetime, "date", FD)
    sd.main()
    out = capsys.readouterr().out
    assert "DRY:" in out
    assert "1 déjà servis" in out          # abonné 2, dernier_digest = 2026-09-24
    assert calls == []                      # aucun insert/update en dry-run
```

**Vérification :** `python3 -m pytest -v` → toute la suite PASS. Puis `python3 send_digests.py --dry-run` **ne doit pas être lancé** (il exige les secrets) : la non-régression est couverte par le test ci-dessus.

**Commit :** `refactor: plan_for_subscriber extrait de send_digests, tests`

---

### Tâche 7 : workflow CI

**Créer `.github/workflows/test.yml`** :

```yaml
name: tests

on:
  push:
    paths: ["pipeline/**", ".github/workflows/test.yml"]
  pull_request:
    paths: ["pipeline/**", ".github/workflows/test.yml"]

jobs:
  pytest:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -r pipeline/requirements-dev.txt
      - run: cd pipeline && python3 -m pytest -v
```

Aucun secret n'est passé au job : c'est voulu, les tests doivent tourner sans.

**Vérification :** après push de la branche, l'onglet Actions montre le job `tests / pytest` vert. Colle l'URL du run dans la PR.

**Commit :** `ci: workflow tests pipeline sur push et PR`

---

## Critères de fin (à vérifier avant d'ouvrir la PR)

- [ ] `cd pipeline && python3 -m pytest -v` : tous les tests passent en local, **sans** `~/.repreneur-env` ni variable d'environnement.
- [ ] `grep -rn "urlopen" pipeline/tests/` ne retourne que la ligne de `conftest.py`.
- [ ] Aucun fichier de `data/`, aucun SIREN réel, aucun téléphone réel, aucun email réel dans `pipeline/tests/fixtures/` (relis les fixtures une par une).
- [ ] `git diff main --stat` ne montre que les fichiers de la liste « Fichiers autorisés ».
- [ ] Le workflow `tests` est vert sur la branche.
- [ ] La description de la PR contient : le nombre de tests, l'URL du run CI, et une section « Observations » listant au minimum : la regex `^0[1-5,9]` de `confiance`, le pluriel « 1 commerce viennent », et tout écart entre ce plan et le comportement réel constaté.

## Hors périmètre (ne pas faire)

- Corriger les bugs observés (regex, accord du verbe) : ils sont à décider par l'utilisateur.
- Tester `outreach.py`, `teaser*.py`, `scrape_emails.py`, `watch_stripe.py`, `find_targets*.py`.
- Ajouter une dépendance autre que pytest.
- Toucher au site Next.js ou aux workflows cron existants.
