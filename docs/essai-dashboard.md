# Essai 7 jours activé depuis le dashboard (sans carte)

## Migration à appliquer

**À exécuter à la main dans l'éditeur SQL Supabase AVANT de merger.** Sans ces colonnes, `sign-deal` échoue sur l'upsert `subscribers` (le closer voit l'erreur, rien n'est écrit) et `send_digests.py` échoue sur l'update `essai_expire_at`.

Fichier : `pipeline/migrations/2026-09-24-essai-dashboard.sql`

```sql
alter table subscribers
  add column if not exists essai_source text,            -- 'dashboard' | 'stripe'
  add column if not exists essai_rappel_at timestamptz,  -- email J+5 envoyé
  add column if not exists essai_expire_at timestamptz;  -- coupé par le cron sans paiement
alter table prospects_pool
  add column if not exists subscriber_id bigint references subscribers(id);
```

La migration est idempotente (`if not exists`) : la relancer ne casse rien. Un deal classique (sans essai) n'écrit pas `subscriber_id` et continue de fonctionner même si la migration n'est pas encore passée.

## Parcours

Horaires calculés avec le cron `cron-daily` à 05:00 UTC (7h Paris l'été, 6h l'hiver) et un essai démarré en journée.

| Jour | Ce qui se passe | Où |
|---|---|---|
| J0 | Lawrenza choisit « Essai 7 j · Régional » (ou Départemental) sur un prospect qui a un email. La ligne `subscribers` est créée : `essai = true`, `essai_source = 'dashboard'`, `statut = 'actif'`, `essai_fin = J0 + 7 j`. Le prospect passe `signe` avec `subscriber_id`. Toast « Essai démarré. Premier digest demain 8h. » | `sign-deal`, `lib/essai.js` |
| J1 | Premier digest du matin. | `send_digests.py` |
| J5 | Email de rappel depuis `onboarding@lebonprospect.fr` : fin d'essai, bouton vers le Payment Link **direct** du même plan (149 € ou 299 €, sans nouvel essai Stripe). Un seul rappel par abonné (`essai_rappel_at`). Lawrenza appelle le client dans la foulée. | `remind_essais.py` |
| J7 | `essai_fin` atteint. Le digest continue : 24 h de marge pour laisser arriver le webhook `invoice.paid` si la carte a été ajoutée le dernier jour. | |
| J8 | Dernier digest (fin d'essai passée depuis moins de 24 h). | `send_digests.py` |
| J9 | Sans paiement : `statut = 'pause'`, `essai_expire_at = now()`, plus aucun digest. Ligne `ESSAI EXPIRÉ` dans les logs du cron. | `send_digests.py` |

Si l'essai démarre avant 05:00 UTC, tout arrive un jour plus tôt (rappel J4, coupure J8).

Règles de refus au démarrage (le closer voit le motif en toast, rien n'est écrit) :
- prospect sans email, plan National, zone non reconnue, Départemental sur une zone région (voir Limites) ;
- email déjà abonné payant, ou abonné actif (essai en cours, Stripe ou dashboard) ;
- email ayant **déjà eu un essai**, même expiré : pas de second essai, on propose l'abonnement.

Les essais Stripe (Payment Links essai) ne sont **pas** concernés par le rappel ni par la coupure : Stripe envoie son propre rappel et le webhook gère leur fin.

## Lien avec le webhook Stripe

Quand le client paie via le Payment Link direct **avec le même email**, `upsertFromSession` écrase la ligne d'essai par `onConflict: "email"` : `stripe_customer_id` et `stripe_subscription_id` sont renseignés, `statut = 'actif'`, puis `invoice.paid` pose `premier_paiement_at`. Le client continue de recevoir ses digests sans interruption, y compris s'il paie après la coupure (la ligne repasse `actif`).

Conséquence du lien direct : le webhook écrit `essai = false` (le Payment Link direct n'a pas la metadata `essai=7j`). La ligne **sort donc du panneau « Essais gratuits »**, qui ne liste que `essai = true` : elle n'y apparaît pas « convertie ». `essai_source = 'dashboard'` est conservé (le webhook ne touche pas cette colonne), ce qui permet de suivre les conversions en SQL :

```sql
select email, societe, plan, created_at, premier_paiement_at
from subscribers
where essai_source = 'dashboard'
order by created_at desc;
-- converti : premier_paiement_at non null ; expiré : essai_expire_at non null
```

**Risque : si le client saisit un autre email sur Stripe**, une seconde ligne est créée (l'abonnement payant) et la ligne d'essai finit en `pause` à J+9. Le client est bien servi par la nouvelle ligne, mais le lien avec le prospect (`prospects_pool.subscriber_id`) pointe sur l'ancienne. Lawrenza doit demander au client d'utiliser **le même email** sur Stripe.

Même logique pour la zone : le webhook remplace `regions` / `departements` par la zone saisie sur Stripe. Si le client y tape une zone non reconnue, la ligne perd sa zone et le digest devient national. Lawrenza doit lui dire de saisir la même zone.

## Limites

- **L'essai Départemental depuis le dashboard n'est possible que si `prospects_pool.region` contient un département ou un code** (ex. « Rhône, 69 »). Le pool stocke un libellé de région (« Occitanie ») : `resolveZone` renvoie alors une région et l'essai Départemental est refusé avec « choisissez Régional ». Sinon utiliser Régional, ou passer par le Payment Link Stripe où le client saisit sa zone.
- Verticale fixée à `chr` à la création, comme le webhook Stripe.
- Si la base est déjà à jour au moment du cron (`Rien à faire` dans les logs), `cron_github.py` s'arrête avant les digests **et** avant les rappels (comportement existant, non modifié ici). Le rappel part alors au cron suivant, tant que la fin d'essai n'est pas passée.

## Test manuel après déploiement

1. Sur un compte `essai_autorise`, choisir « Essai 7 j · Régional » sur un prospect dont l'email est une adresse de test à vous.
2. Dans Supabase, vérifier la ligne `subscribers` : `essai = true`, `essai_source = 'dashboard'`, `statut = 'actif'`, `essai_fin` à J+7. Vérifier aussi `prospects_pool.subscriber_id` sur le prospect.
3. Lancer `python3 send_digests.py --dry-run` (avec les secrets en local) : l'email de test doit apparaître dans une ligne `DRY:`.
4. Vérifier que le panneau « Essais gratuits » du dashboard l'affiche « en cours ».
5. Supprimer la ligne de test dans `subscribers` (et remettre `prospects_pool.subscriber_id` à null sur le prospect de test).

Bonus, sans attendre 5 jours : `update subscribers set essai_fin = now() + interval '2 days' where email = '<email de test>';` puis `python3 remind_essais.py --dry-run` doit afficher `DRY: rappel → <email de test>`.

## Vérifier le cron le lendemain

Dans GitHub Actions, workflow `cron-daily`, étape « Ingest yesterday », chercher :
- `digests: BILAN: … essais expirés` (nouveau compteur, `0` tant qu'aucun essai n'a expiré) ;
- `rappels: BILAN rappels: 0` s'il n'y a aucun essai en fin de période. Une erreur du rappel s'affiche en `rappels: erreur …` ou `rappels (erreurs): …` sans faire échouer le cron.
