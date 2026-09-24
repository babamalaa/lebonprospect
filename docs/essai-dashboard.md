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
