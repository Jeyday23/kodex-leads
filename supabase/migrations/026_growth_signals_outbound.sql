-- WS3: signals, explainable lead scoring, outbound sequences (gated, approval-only).
-- Idempotent: safe to re-run. RLS policy loop copied from migration 014.

create extension if not exists pgcrypto;

create table if not exists growth_signal_events (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  source text not null,
  company_name text,
  company_domain text,
  person_name text,
  person_title text,
  evidence jsonb not null default '{}',
  url text,
  strength numeric not null default 0,
  dedupe_key text not null,
  detected_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table growth_signal_events drop constraint if exists growth_signal_events_type_check;
alter table growth_signal_events
  add constraint growth_signal_events_type_check
  check (type in ('keyword', 'competitor', 'influencer', 'own_brand', 'hiring', 'stack', 'regulatory', 'manual'));

alter table growth_signal_events drop constraint if exists growth_signal_events_dedupe_key_key;
alter table growth_signal_events add constraint growth_signal_events_dedupe_key_key unique (dedupe_key);

create index if not exists growth_signal_events_type_detected_idx on growth_signal_events(type, detected_at desc);

create table if not exists growth_lead_scores (
  id uuid primary key default gen_random_uuid(),
  lead_ref text not null,
  lead_table text not null,
  confidence numeric not null default 0,
  factors jsonb not null default '[]',
  rationale text,
  scored_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table growth_lead_scores drop constraint if exists growth_lead_scores_confidence_check;
alter table growth_lead_scores
  add constraint growth_lead_scores_confidence_check check (confidence between 0 and 100);

create index if not exists growth_lead_scores_lead_ref_idx on growth_lead_scores(lead_ref);

create table if not exists growth_sequences (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text not null,
  objective text,
  calendar_link text,
  steps jsonb not null default '[]',
  daily_cap integer not null default 20,
  send_window jsonb not null default '{}',
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table growth_sequences drop constraint if exists growth_sequences_channel_check;
alter table growth_sequences
  add constraint growth_sequences_channel_check check (channel in ('email', 'linkedin_manual'));

create table if not exists growth_sequence_enrollments (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid references growth_sequences(id) on delete cascade,
  lead_ref text not null,
  lead_table text not null,
  state text not null default 'pending',
  timeline jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table growth_sequence_enrollments drop constraint if exists growth_sequence_enrollments_state_check;
alter table growth_sequence_enrollments
  add constraint growth_sequence_enrollments_state_check
  check (state in ('pending', 'awaiting_approval', 'active', 'replied', 'completed', 'stopped'));

create index if not exists growth_sequence_enrollments_sequence_state_idx on growth_sequence_enrollments(sequence_id, state);

create table if not exists growth_outreach_tasks (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid references growth_sequence_enrollments(id) on delete cascade,
  -- Correlates back to the enrollment's timeline entry (engine.ts SequenceStep.id)
  -- so an approval decision made against the enrollment can be reflected on
  -- the matching task without re-deriving which step it belongs to.
  step_id text,
  kind text not null,
  draft_copy text,
  status text not null default 'queued',
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table growth_outreach_tasks add column if not exists step_id text;

alter table growth_outreach_tasks drop constraint if exists growth_outreach_tasks_kind_check;
alter table growth_outreach_tasks
  add constraint growth_outreach_tasks_kind_check check (kind in ('visit', 'like', 'connect', 'message', 'email'));

alter table growth_outreach_tasks drop constraint if exists growth_outreach_tasks_status_check;
alter table growth_outreach_tasks
  add constraint growth_outreach_tasks_status_check check (status in ('queued', 'approved', 'done', 'skipped'));

create index if not exists growth_outreach_tasks_status_due_idx on growth_outreach_tasks(status, due_at);

alter table growth_signal_events enable row level security;
alter table growth_lead_scores enable row level security;
alter table growth_sequences enable row level security;
alter table growth_sequence_enrollments enable row level security;
alter table growth_outreach_tasks enable row level security;

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'growth_signal_events',
    'growth_lead_scores',
    'growth_sequences',
    'growth_sequence_enrollments',
    'growth_outreach_tasks'
  ]) loop
    execute format('drop policy if exists %I on %I', t || '_service_role_all', t);
    execute format('create policy %I on %I for all using (auth.role() = ''service_role'') with check (auth.role() = ''service_role'')', t || '_service_role_all', t);
    execute format('drop policy if exists %I on %I', t || '_admin_all', t);
    execute format('create policy %I on %I for all using (exists (select 1 from profiles p where p.id = auth.uid() and lower(p.role) in (''admin'', ''administrator'', ''owner'', ''founder''))) with check (exists (select 1 from profiles p where p.id = auth.uid() and lower(p.role) in (''admin'', ''administrator'', ''owner'', ''founder'')))', t || '_admin_all', t);
  end loop;
end $$;

notify pgrst, 'reload schema';
