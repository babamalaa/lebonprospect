-- LeBonProspect — schéma initial (Supabase/PostgreSQL)
-- Appliqué via l'API management une fois le projet créé.

create table if not exists cessions (
  id bigint generated always as identity primary key,
  bodacc_id text unique not null,
  date_parution date not null,
  type_avis text,
  commercant text,
  ville text,
  cp text,
  departement text,
  region text,
  tribunal text,
  -- Cessionnaire (l'acheteur = LE prospect)
  acheteur_siren text,
  acheteur_nom text,
  acheteur_forme text,
  acheteur_naf text,
  acheteur_date_creation date,
  acheteur_dirigeants text[],       -- jusqu'à 3 noms
  acheteur_adresse text,
  -- Cédant (le vendeur — sert à identifier le fonds)
  vendeur_siren text,
  vendeur_nom text,
  vendeur_naf text,
  -- Classification
  naf_fonds text,                    -- NAF retenu pour le fonds cédé
  verticale text not null default 'inconnu',
  -- Contact (enrichi via Places API quand la zone est vendue)
  telephone text,
  telephone_confiance text check (telephone_confiance in ('fixe_etablissement','mobile','inconnu')),
  place_name text,                   -- nom de la fiche établissement matchée
  enrichi_places boolean not null default false,
  -- Brut
  acte_descriptif text,
  raw jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_cessions_date on cessions (date_parution desc);
create index if not exists idx_cessions_verticale on cessions (verticale, region, date_parution desc);
create index if not exists idx_cessions_dept on cessions (verticale, departement, date_parution desc);

-- Abonnés (avant même l'auth : un abonné = un email + un périmètre)
create table if not exists subscribers (
  id bigint generated always as identity primary key,
  email text unique not null,
  nom text,
  societe text,
  plan text not null check (plan in ('departemental','regional','national')),
  verticales text[] not null default '{chr}',
  departements text[],               -- pour plan departemental
  regions text[],                    -- pour plan regional
  stripe_customer_id text,
  stripe_subscription_id text,
  statut text not null default 'actif' check (statut in ('actif','pause','resilie','essai')),
  dernier_digest date,
  created_at timestamptz not null default now()
);

-- Journal d'envois (débuggage + SLA)
create table if not exists digests_log (
  id bigint generated always as identity primary key,
  subscriber_id bigint references subscribers(id),
  date_digest date not null,
  nb_leads int not null,
  resend_id text,
  statut text not null default 'envoye',
  created_at timestamptz not null default now()
);

-- Stats matérialisées pour les compteurs SEO de la landing
create materialized view if not exists stats_verticale_region as
select verticale, region,
       count(*) filter (where date_parution >= current_date - 30) as n_30j,
       count(*) filter (where date_parution >= current_date - 90) as n_90j,
       count(*) filter (where date_parution >= current_date - 365) as n_12m
from cessions
group by verticale, region;

-- RLS: la landing lit les stats, seul le service role écrit
alter table cessions enable row level security;
alter table subscribers enable row level security;
alter table digests_log enable row level security;
create policy cessions_no_public on cessions for select using (false);
create policy subscribers_no_public on subscribers for select using (false);
