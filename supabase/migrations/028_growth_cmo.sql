-- Growth Engine WS5: CMO assistant threads, messages and proposal actions.
-- Idempotent, matching the admin/service-role RLS pattern from prior growth
-- migrations.

create extension if not exists pgcrypto;

do $$ begin
  create type growth_cmo_message_role as enum ('user', 'assistant', 'system', 'tool');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type growth_cmo_action_status as enum ('proposed', 'confirmed', 'executed', 'rejected', 'failed');
exception when duplicate_object then null;
end $$;

alter type growth_cmo_action_status add value if not exists 'executed';
alter type growth_cmo_action_status add value if not exists 'failed';

create table if not exists growth_cmo_threads (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'CMO thread',
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists growth_cmo_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references growth_cmo_threads(id) on delete cascade,
  role growth_cmo_message_role not null,
  content text not null default '',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists growth_cmo_actions (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references growth_cmo_threads(id) on delete cascade,
  message_id uuid references growth_cmo_messages(id) on delete set null,
  action_type text not null,
  title text not null,
  payload jsonb not null default '{}',
  status growth_cmo_action_status not null default 'proposed',
  result jsonb not null default '{}',
  created_by text,
  decided_by text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table growth_cmo_actions add column if not exists result jsonb not null default '{}';

create index if not exists growth_cmo_threads_updated_idx
  on growth_cmo_threads (updated_at desc);

create index if not exists growth_cmo_messages_thread_created_idx
  on growth_cmo_messages (thread_id, created_at asc);

create index if not exists growth_cmo_actions_thread_status_idx
  on growth_cmo_actions (thread_id, status, created_at desc);

alter table growth_cmo_threads enable row level security;
alter table growth_cmo_messages enable row level security;
alter table growth_cmo_actions enable row level security;

do $$ declare
  t text;
begin
  foreach t in array array[
    'growth_cmo_threads',
    'growth_cmo_messages',
    'growth_cmo_actions'
  ] loop
    execute format('drop policy if exists %I on %I', t || '_service_role_all', t);
    execute format('create policy %I on %I for all using (auth.role() = ''service_role'') with check (auth.role() = ''service_role'')', t || '_service_role_all', t);
    execute format('drop policy if exists %I on %I', t || '_admin_all', t);
    execute format('create policy %I on %I for all using (exists (select 1 from profiles p where p.id = auth.uid() and lower(p.role) in (''admin'', ''administrator'', ''owner'', ''founder''))) with check (exists (select 1 from profiles p where p.id = auth.uid() and lower(p.role) in (''admin'', ''administrator'', ''owner'', ''founder'')))', t || '_admin_all', t);
  end loop;
end $$;

notify pgrst, 'reload schema';
