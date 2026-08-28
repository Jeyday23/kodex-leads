create extension if not exists pgcrypto;

do $$ begin
  create type authority_autopilot_mode as enum ('off', 'draft_only', 'guarded', 'controlled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type authority_asset_status as enum ('planned', 'researching', 'briefed', 'drafting', 'validating', 'ready_for_approval', 'approved', 'published', 'blocked', 'archived');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type authority_claim_category as enum ('legal_obligation', 'deadline', 'penalty', 'applicability', 'regulator_guidance', 'product_capability', 'competitor_comparison', 'quantitative_statement', 'general_explanation');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type authority_verification_result as enum ('pending', 'verified', 'unsupported', 'conflicting', 'needs_review');
exception when duplicate_object then null;
end $$;

create table if not exists authority_automation_settings (
  id text primary key default 'global',
  mode authority_autopilot_mode not null default 'draft_only',
  max_new_pages_per_day integer not null default 3,
  max_revisions_per_day integer not null default 10,
  pilot_completed boolean not null default false,
  changed_by text,
  changed_at timestamptz not null default now(),
  audit jsonb not null default '[]',
  constraint authority_automation_settings_singleton check (id = 'global')
);

insert into authority_automation_settings (id, mode)
values ('global', 'draft_only')
on conflict (id) do nothing;

create table if not exists authority_content_assets (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references authority_opportunities(id) on delete set null,
  content_page_id uuid references content_pages(id) on delete set null,
  canonical_asset_id uuid references authority_content_assets(id) on delete set null,
  title text not null,
  slug text not null,
  route_path text,
  content_type text not null,
  framework text,
  jurisdiction text,
  language text not null default 'en',
  target_query text not null,
  supporting_queries text[] not null default '{}',
  intent text,
  audience text,
  status authority_asset_status not null default 'planned',
  risk_level text not null default 'medium',
  approval_required boolean not null default true,
  autopilot_run_id uuid,
  selected_score numeric not null default 0,
  source_plan jsonb not null default '[]',
  internal_link_plan jsonb not null default '[]',
  conversion_objective jsonb not null default '{}',
  metadata_plan jsonb not null default '{}',
  structured_data_plan jsonb not null default '{}',
  success_metrics jsonb not null default '{}',
  provenance jsonb not null default '{}',
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(slug, language)
);

create table if not exists authority_content_versions (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references authority_content_assets(id) on delete cascade,
  version_number integer not null,
  version_type text not null default 'draft',
  title text not null,
  description text not null,
  body jsonb not null,
  direct_answer text,
  outline jsonb not null default '[]',
  faq_plan jsonb not null default '[]',
  metadata jsonb not null default '{}',
  content_hash text not null,
  quality_score integer not null default 0,
  validation_status authority_verification_result not null default 'pending',
  approval_status text not null default 'pending',
  published_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  unique(asset_id, version_number),
  unique(asset_id, content_hash)
);

create table if not exists authority_content_claims (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references authority_content_assets(id) on delete cascade,
  version_id uuid references authority_content_versions(id) on delete cascade,
  content_page_id uuid references content_pages(id) on delete set null,
  claim_text text not null,
  claim_category authority_claim_category not null,
  jurisdiction text,
  effective_date date,
  confidence numeric not null default 0,
  verification_result authority_verification_result not null default 'pending',
  reviewer_required boolean not null default false,
  last_checked_at timestamptz,
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists authority_claim_sources (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references authority_content_claims(id) on delete cascade,
  knowledge_source_id uuid references authority_knowledge_sources(id) on delete set null,
  source_document_id uuid references source_documents(id) on delete set null,
  source_url text not null,
  source_title text not null,
  issuing_body text,
  jurisdiction text,
  publication_date date,
  effective_date date,
  retrieved_at timestamptz not null default now(),
  content_hash text,
  evidence jsonb not null default '{}',
  excerpt text,
  unique(claim_id, source_url, content_hash)
);

create table if not exists authority_quality_gate_runs (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references authority_content_assets(id) on delete cascade,
  version_id uuid references authority_content_versions(id) on delete cascade,
  status text not null default 'running',
  score integer not null default 0,
  decision text not null default 'pending',
  blockers text[] not null default '{}',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  actor text,
  idempotency_key text unique
);

create table if not exists authority_quality_gate_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references authority_quality_gate_runs(id) on delete cascade,
  gate_name text not null,
  status text not null,
  severity text not null default 'medium',
  score_delta integer not null default 0,
  message text not null,
  evidence jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique(run_id, gate_name)
);

create table if not exists authority_approval_policies (
  id uuid primary key default gen_random_uuid(),
  policy_key text unique not null,
  label text not null,
  risk_level text not null,
  requires_admin boolean not null default true,
  auto_publish_allowed boolean not null default false,
  conditions jsonb not null default '{}',
  active boolean not null default true,
  updated_by text,
  updated_at timestamptz not null default now()
);

insert into authority_approval_policies (policy_key, label, risk_level, requires_admin, auto_publish_allowed, conditions)
values
  ('low_risk_guarded', 'Low-risk guarded publication', 'low', false, true, '{"allowed_changes":["metadata","internal_link","grammar","verified_knowledge_addition"]}'),
  ('new_legal_page', 'New legal page approval', 'high', true, false, '{"requires":["admin_approval","verified_claims","pilot_or_controlled_mode"]}'),
  ('competitor_or_product_claim', 'Competitor or product claim approval', 'high', true, false, '{"requires":["admin_approval","verifiable_basis"]}')
on conflict (policy_key) do nothing;

create table if not exists authority_approval_requests (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references authority_content_assets(id) on delete cascade,
  version_id uuid references authority_content_versions(id) on delete cascade,
  policy_id uuid references authority_approval_policies(id) on delete set null,
  status text not null default 'pending',
  requested_by text,
  requested_at timestamptz not null default now(),
  decided_by text,
  decided_at timestamptz,
  decision_note text
);

create table if not exists authority_publication_jobs (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references authority_content_assets(id) on delete cascade,
  version_id uuid not null references authority_content_versions(id) on delete cascade,
  job_type text not null default 'publish',
  status text not null default 'queued',
  scheduled_for timestamptz,
  attempt_count integer not null default 0,
  idempotency_key text unique,
  actor text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists authority_publication_events (
  id uuid primary key default gen_random_uuid(),
  publication_job_id uuid references authority_publication_jobs(id) on delete set null,
  asset_id uuid not null references authority_content_assets(id) on delete cascade,
  version_id uuid references authority_content_versions(id) on delete set null,
  event_type text not null,
  route_path text,
  http_status integer,
  result jsonb not null default '{}',
  actor text,
  created_at timestamptz not null default now()
);

create table if not exists authority_page_audits (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references authority_content_assets(id) on delete cascade,
  content_page_id uuid references content_pages(id) on delete cascade,
  route_path text not null,
  http_status integer,
  canonical_ok boolean not null default false,
  title_ok boolean not null default false,
  h1_ok boolean not null default false,
  robots_ok boolean not null default false,
  sitemap_ok boolean not null default false,
  internal_links_ok boolean not null default false,
  structured_data_ok boolean not null default false,
  mobile_safe boolean not null default true,
  issues jsonb not null default '[]',
  checked_at timestamptz not null default now()
);

create table if not exists authority_internal_links (
  id uuid primary key default gen_random_uuid(),
  source_asset_id uuid references authority_content_assets(id) on delete cascade,
  target_asset_id uuid references authority_content_assets(id) on delete set null,
  source_path text,
  target_path text not null,
  anchor_text text not null,
  relationship text not null default 'cluster',
  status text not null default 'recommended',
  created_at timestamptz not null default now(),
  unique(source_asset_id, target_path, anchor_text)
);

create table if not exists authority_search_metrics (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references authority_content_assets(id) on delete cascade,
  content_page_id uuid references content_pages(id) on delete cascade,
  metric_date date not null,
  page text not null,
  query text,
  country text,
  device text,
  impressions integer not null default 0,
  clicks integer not null default 0,
  ctr numeric not null default 0,
  average_position numeric,
  source text not null default 'google_search_console',
  created_at timestamptz not null default now(),
  unique(metric_date, page, query, country, device)
);

create table if not exists authority_llm_asset_metrics (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references authority_content_assets(id) on delete cascade,
  monitoring_run_id uuid references monitoring_runs(id) on delete set null,
  provider text not null,
  model text,
  country text,
  language text,
  search_mode text,
  kodex_mentioned boolean not null default false,
  kodex_direct_citation boolean not null default false,
  cited_kodex_url text,
  citation_position integer,
  competitor_mentions jsonb not null default '[]',
  competitor_citations jsonb not null default '[]',
  answer_snapshot text,
  observed_at timestamptz not null default now()
);

create table if not exists authority_revision_plans (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references authority_content_assets(id) on delete cascade,
  trigger_type text not null,
  trigger_signal jsonb not null default '{}',
  recommended_actions jsonb not null default '[]',
  risk_level text not null default 'medium',
  status text not null default 'open',
  created_by text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists authority_revision_events (
  id uuid primary key default gen_random_uuid(),
  revision_plan_id uuid references authority_revision_plans(id) on delete cascade,
  asset_id uuid references authority_content_assets(id) on delete cascade,
  from_version_id uuid references authority_content_versions(id) on delete set null,
  to_version_id uuid references authority_content_versions(id) on delete set null,
  event_type text not null,
  result jsonb not null default '{}',
  actor text,
  created_at timestamptz not null default now()
);

create table if not exists authority_content_experiments (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references authority_content_assets(id) on delete cascade,
  experiment_key text not null,
  hypothesis text not null,
  variant jsonb not null default '{}',
  metric_goal text not null,
  status text not null default 'planned',
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  unique(asset_id, experiment_key)
);

create table if not exists authority_outreach_opportunities (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references authority_content_assets(id) on delete set null,
  opportunity_type text not null,
  organization text,
  contact_url text,
  rationale text not null,
  draft_message text,
  status text not null default 'identified',
  approval_required boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists authority_conversion_metrics (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references authority_content_assets(id) on delete cascade,
  content_page_id uuid references content_pages(id) on delete cascade,
  metric_date date not null,
  target_cta text,
  lead_source text,
  assessment_flow text,
  conversion_event text,
  visits integer not null default 0,
  assessment_starts integer not null default 0,
  leads integer not null default 0,
  qualified_leads integer not null default 0,
  assisted_conversions integer not null default 0,
  crm_routed integer not null default 0,
  created_at timestamptz not null default now(),
  unique(asset_id, metric_date, conversion_event)
);

create index if not exists authority_assets_status_idx on authority_content_assets(status, updated_at desc);
create index if not exists authority_assets_query_idx on authority_content_assets(target_query);
create index if not exists authority_assets_content_page_idx on authority_content_assets(content_page_id);
create index if not exists authority_versions_asset_idx on authority_content_versions(asset_id, version_number desc);
create index if not exists authority_claims_asset_idx on authority_content_claims(asset_id, verification_result);
create index if not exists authority_claim_sources_claim_idx on authority_claim_sources(claim_id);
create index if not exists authority_gate_runs_asset_idx on authority_quality_gate_runs(asset_id, completed_at desc);
create index if not exists authority_publication_jobs_status_idx on authority_publication_jobs(status, scheduled_for);
create index if not exists authority_publication_events_asset_idx on authority_publication_events(asset_id, created_at desc);
create index if not exists authority_page_audits_route_idx on authority_page_audits(route_path, checked_at desc);
create index if not exists authority_search_metrics_page_date_idx on authority_search_metrics(page, metric_date desc);
create index if not exists authority_llm_asset_metrics_asset_idx on authority_llm_asset_metrics(asset_id, observed_at desc);
create index if not exists authority_revision_plans_status_idx on authority_revision_plans(status, created_at desc);
create index if not exists authority_outreach_status_idx on authority_outreach_opportunities(status, created_at desc);
create index if not exists authority_conversion_metrics_asset_idx on authority_conversion_metrics(asset_id, metric_date desc);

alter table authority_automation_settings enable row level security;
alter table authority_content_assets enable row level security;
alter table authority_content_versions enable row level security;
alter table authority_content_claims enable row level security;
alter table authority_claim_sources enable row level security;
alter table authority_quality_gate_runs enable row level security;
alter table authority_quality_gate_results enable row level security;
alter table authority_approval_policies enable row level security;
alter table authority_approval_requests enable row level security;
alter table authority_publication_jobs enable row level security;
alter table authority_publication_events enable row level security;
alter table authority_page_audits enable row level security;
alter table authority_internal_links enable row level security;
alter table authority_search_metrics enable row level security;
alter table authority_llm_asset_metrics enable row level security;
alter table authority_revision_plans enable row level security;
alter table authority_revision_events enable row level security;
alter table authority_content_experiments enable row level security;
alter table authority_outreach_opportunities enable row level security;
alter table authority_conversion_metrics enable row level security;

do $$ declare
  t text;
begin
  foreach t in array array[
    'authority_automation_settings',
    'authority_content_assets',
    'authority_content_versions',
    'authority_content_claims',
    'authority_claim_sources',
    'authority_quality_gate_runs',
    'authority_quality_gate_results',
    'authority_approval_policies',
    'authority_approval_requests',
    'authority_publication_jobs',
    'authority_publication_events',
    'authority_page_audits',
    'authority_internal_links',
    'authority_search_metrics',
    'authority_llm_asset_metrics',
    'authority_revision_plans',
    'authority_revision_events',
    'authority_content_experiments',
    'authority_outreach_opportunities',
    'authority_conversion_metrics'
  ] loop
    execute format('drop policy if exists %I on %I', t || '_service_role_all', t);
    execute format('create policy %I on %I for all using (auth.role() = ''service_role'') with check (auth.role() = ''service_role'')', t || '_service_role_all', t);
    execute format('drop policy if exists %I on %I', t || '_admin_all', t);
    execute format('create policy %I on %I for all using (exists (select 1 from profiles p where p.id = auth.uid() and lower(p.role) in (''admin'', ''administrator'', ''owner'', ''founder''))) with check (exists (select 1 from profiles p where p.id = auth.uid() and lower(p.role) in (''admin'', ''administrator'', ''owner'', ''founder'')))', t || '_admin_all', t);
  end loop;
end $$;
