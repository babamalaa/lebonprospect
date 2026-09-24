# Essai 7 jours activé depuis le dashboard (sans carte)

## Migration à appliquer

**À exécuter à la main dans l'éditeur SQL Supabase AVANT de merger.** Sans ces colonnes, `sign-deal` échoue sur l'upsert `subscribers` et `send_digests.py` échoue sur l'update `essai_expire_at`.

Fichier : `pipeline/migrations/2026-09-24-essai-dashboard.sql`

```sql
alter table subscribers
  add column if not exists essai_source text,            -- 'dashboard' | 'stripe'
  add column if not exists essai_rappel_at timestamptz,  -- email J+5 envoyé
  add column if not exists essai_expire_at timestamptz;  -- coupé par le cron sans paiement
alter table prospects_pool
  add column if not exists subscriber_id bigint references subscribers(id);
```

La migration est idempotente (`if not exists`) : la relancer ne casse rien.

## Test manuel après déploiement

1. Sur un compte `essai_autorise`, choisir « Essai 7 j · Régional » sur un prospect dont l'email est une adresse de test à vous.
2. Dans Supabase, vérifier la ligne `subscribers` : `essai = true`, `essai_source = 'dashboard'`, `statut = 'actif'`, `essai_fin` à J+7. Vérifier aussi `prospects_pool.subscriber_id` sur le prospect.
3. Lancer `python3 send_digests.py --dry-run` (avec les secrets en local) : l'email de test doit apparaître dans une ligne `DRY:`.
4. Vérifier que le panneau « Essais gratuits » du dashboard l'affiche « en cours ».
5. Supprimer la ligne de test dans `subscribers` (et remettre `prospects_pool.subscriber_id` à null sur le prospect de test).
