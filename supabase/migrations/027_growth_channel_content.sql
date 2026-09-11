-- Growth Engine WS4: channel content drafts, Reddit opportunities, and
-- per-channel planner settings. Idempotent (safe to re-run): guarded with
-- `if not exists` / `do $$ ... exception when duplicate_object` / ON CONFLICT
-- as appropriate, matching the pattern established in migration 014.

create extension if not exists pgcrypto;

do $$ begin
  create type growth_channel as enum ('linkedin', 'x', 'reddit', 'article_brief', 'email');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type growth_draft_status as enum ('draft', 'approved', 'scheduled', 'published', 'rejected');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type growth_reddit_opportunity_status as enum ('new', 'drafted', 'skipped', 'answered');
exception when duplicate_object then null;
end $$;

create table if not exists growth_channel_drafts (
  id uuid primary key default gen_random_uuid(),
  channel growth_channel not null,
  status growth_draft_status not null default 'draft',
  title text,
  body text not null default '',
  source_ref jsonb not null default '{}',
  voice_snapshot jsonb not null default '{}',
  quality jsonb not null default '{}',
  rationale text,
  scheduled_for timestamptz,
  published_url text,
  created_by text,
  decided_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists growth_channel_drafts_channel_status_idx
  on growth_channel_drafts (channel, status);

create index if not exists growth_channel_drafts_status_scheduled_idx
  on growth_channel_drafts (status, scheduled_for);

create table if not exists growth_reddit_opportunities (
  id uuid primary key default gen_random_uuid(),
  subreddit text not null,
  thread_url text not null,
  title text not null,
  snippet text,
  matched_keywords text[] not null default '{}',
  score numeric not null default 0,
  status growth_reddit_opportunity_status not null default 'new',
  found_at timestamptz not null default now(),
  constraint growth_reddit_opportunities_thread_url_key unique (thread_url)
);

create index if not exists growth_reddit_opportunities_subreddit_found_idx
  on growth_reddit_opportunities (subreddit, found_at desc);

create table if not exists growth_channel_settings (
  channel growth_channel primary key,
  enabled boolean not null default true,
  weekly_target integer not null default 0,
  auto_draft boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into growth_channel_settings (channel, enabled, weekly_target, auto_draft)
values
  ('article_brief', true, 7, false),
  ('reddit', true, 14, false),
  ('x', true, 7, false),
  ('linkedin', true, 7, false),
  ('email', false, 0, false)
on conflict (channel) do nothing;

alter table growth_channel_drafts enable row level security;
alter table growth_reddit_opportunities enable row level security;
alter table growth_channel_settings enable row level security;

do $$ declare
  t text;
begin
  foreach t in array array[
    'growth_channel_drafts',
    'growth_reddit_opportunities',
    'growth_channel_settings'
  ] loop
    execute format('drop policy if exists %I on %I', t || '_service_role_all', t);
    execute format('create policy %I on %I for all using (auth.role() = ''service_role'') with check (auth.role() = ''service_role'')', t || '_service_role_all', t);
    execute format('drop policy if exists %I on %I', t || '_admin_all', t);
    execute format('create policy %I on %I for all using (exists (select 1 from profiles p where p.id = auth.uid() and lower(p.role) in (''admin'', ''administrator'', ''owner'', ''founder''))) with check (exists (select 1 from profiles p where p.id = auth.uid() and lower(p.role) in (''admin'', ''administrator'', ''owner'', ''founder'')))', t || '_admin_all', t);
  end loop;
end $$;
