-- Growth Engine WS1 - Brain: knowledge graph tables plus channel voices and
-- signal configs. Idempotent: every create uses `if not exists`, every alter
-- uses `add column if not exists`, and the RLS policy loop drops before
-- create so this migration can be re-run safely.
--
-- Extends the existing `competitors` table (migration 011) instead of
-- creating a parallel table, per the WS1 brief.

create table if not exists growth_brain_profile (
  id text primary key default 'global',
  name text not null default 'Not set',
  one_line_description text not null default 'Not set',
  website text not null default 'Not set',
  vertical text not null default 'Not set',
  headquarters text not null default 'Not set',
  market_summary text not null default 'Not set',
  icp jsonb not null default '{}'::jsonb,
  sales_language_rules text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists growth_personas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text not null,
  goals text[] not null default '{}',
  pains text[] not null default '{}',
  triggers text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists growth_keywords (
  id uuid primary key default gen_random_uuid(),
  term text not null,
  type text not null check (type in ('product', 'problem', 'competitor')),
  language text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists growth_message_pillars (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  claim text not null,
  proof text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists growth_objections (
  id uuid primary key default gen_random_uuid(),
  objection text not null,
  response text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists growth_influencers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  handle text not null default 'Not set',
  platform text not null default 'Not set',
  why text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists growth_channel_voices (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('linkedin', 'x', 'reddit', 'articles', 'email')),
  tone text not null,
  rules text[] not null default '{}',
  banned_terms text[] not null default '{}',
  max_length integer not null,
  example text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel)
);

create table if not exists growth_signal_configs (
  id uuid primary key default gen_random_uuid(),
  type text not null check (
    type in ('keyword', 'competitor', 'influencer', 'own_brand', 'hiring', 'stack', 'regulatory', 'manual')
  ),
  enabled boolean not null default false,
  targets jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (type)
);

-- Extend the existing competitors table (migration 011) rather than creating
-- a parallel one.
alter table competitors add column if not exists summary text;
alter table competitors add column if not exists domain text;

create index if not exists growth_keywords_type_idx on growth_keywords(type);
create index if not exists growth_channel_voices_channel_idx on growth_channel_voices(channel);
create index if not exists growth_signal_configs_type_idx on growth_signal_configs(type);

alter table growth_brain_profile enable row level security;
alter table growth_personas enable row level security;
alter table growth_keywords enable row level security;
alter table growth_message_pillars enable row level security;
alter table growth_objections enable row level security;
alter table growth_influencers enable row level security;
alter table growth_channel_voices enable row level security;
alter table growth_signal_configs enable row level security;

-- Service-role + admin policy loop, copied from migration 014.
do $$ declare
  t text;
begin
  foreach t in array array[
    'growth_brain_profile',
    'growth_personas',
    'growth_keywords',
    'growth_message_pillars',
    'growth_objections',
    'growth_influencers',
    'growth_channel_voices',
    'growth_signal_configs'
  ] loop
    execute format('drop policy if exists %I on %I', t || '_service_role_all', t);
    execute format('create policy %I on %I for all using (auth.role() = ''service_role'') with check (auth.role() = ''service_role'')', t || '_service_role_all', t);
    execute format('drop policy if exists %I on %I', t || '_admin_all', t);
    execute format('create policy %I on %I for all using (exists (select 1 from profiles p where p.id = auth.uid() and lower(p.role) in (''admin'', ''administrator'', ''owner'', ''founder''))) with check (exists (select 1 from profiles p where p.id = auth.uid() and lower(p.role) in (''admin'', ''administrator'', ''owner'', ''founder'')))', t || '_admin_all', t);
  end loop;
end $$;
