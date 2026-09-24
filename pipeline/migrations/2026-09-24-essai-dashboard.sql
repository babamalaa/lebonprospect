-- Essai 7 jours activé depuis le dashboard (sans carte).
-- À exécuter à la main dans Supabase par l'utilisateur ; le pipeline ne l'applique pas.
alter table subscribers
  add column if not exists essai_source text,            -- 'dashboard' | 'stripe'
  add column if not exists essai_rappel_at timestamptz,  -- email J+5 envoyé
  add column if not exists essai_expire_at timestamptz;  -- coupé par le cron sans paiement
alter table prospects_pool
  add column if not exists subscriber_id bigint references subscribers(id);
