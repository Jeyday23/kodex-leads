create extension if not exists pgcrypto;

do $$ begin
  create type authority_run_status as enum ('queued', 'running', 'completed', 'failed');
exception
  when duplicate_object then null;
end $$;

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete set null,
  email text not null,
  full_name text,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists monitoring_projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  brand_name text not null default 'Kodex',
  website_url text,
  default_country text not null default 'US',
  default_language text not null default 'en',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists monitoring_prompts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references monitoring_projects(id) on delete cascade,
  label text not null,
  prompt text not null,
  prompt_group text not null default 'general',
  search_mode text not null default 'answer',
  country text not null default 'US',
  language text not null default 'en',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists providers (
  id text primary key,
  label text not null,
  configured boolean not null default false,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists monitoring_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references monitoring_projects(id) on delete cascade,
  prompt_id uuid references monitoring_prompts(id) on delete set null,
  status authority_run_status not null default 'queued',
  prompt_snapshot text not null,
  search_mode text not null,
  country text not null,
  language text not null,
  started_at timestamptz,
  completed_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create table if not exists provider_responses (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references monitoring_runs(id) on delete cascade,
  provider text not null,
  model text not null,
  answer_snapshot text not null,
  raw_response jsonb not null default '{}',
  latency_ms integer not null default 0,
  estimated_cost numeric,
  extraction_confidence numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists brand_mentions (
  id uuid primary key default gen_random_uuid(),
  response_id uuid references provider_responses(id) on delete cascade,
  brand_name text not null default 'Kodex',
  mentioned boolean not null,
  sentiment text not null default 'neutral',
  recommendation_strength numeric not null default 0,
  evidence text,
  created_at timestamptz not null default now()
);

create table if not exists citations (
  id uuid primary key default gen_random_uuid(),
  response_id uuid references provider_responses(id) on delete cascade,
  title text,
  url text not null,
  domain text not null,
  position integer,
  cites_kodex boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists citation_urls (
  id uuid primary key default gen_random_uuid(),
  url text unique not null,
  domain text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  successful_validation boolean,
  last_status integer
);

create table if not exists competitors (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references monitoring_projects(id) on delete cascade,
  name text not null,
  website_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(project_id, name)
);

create table if not exists competitor_mentions (
  id uuid primary key default gen_random_uuid(),
  response_id uuid references provider_responses(id) on delete cascade,
  competitor_id uuid references competitors(id) on delete set null,
  competitor_name text not null,
  mentioned boolean not null,
  citation_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists visibility_scores (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references monitoring_projects(id) on delete cascade,
  score_date date not null default current_date,
  visibility_score numeric not null,
  citation_rate numeric not null,
  mention_rate numeric not null,
  prompt_count integer not null default 0,
  response_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique(project_id, score_date)
);

create table if not exists scheduled_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references monitoring_projects(id) on delete cascade,
  job_type text not null,
  cron_expression text not null,
  enabled boolean not null default true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists job_failures (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references scheduled_jobs(id) on delete set null,
  run_id uuid references monitoring_runs(id) on delete set null,
  provider text,
  error text not null,
  retry_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete set null,
  actor text,
  action text not null,
  entity_type text not null,
  entity_id text,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists monitoring_prompts_project_active_idx on monitoring_prompts(project_id, active);
create index if not exists monitoring_runs_project_created_idx on monitoring_runs(project_id, created_at desc);
create index if not exists provider_responses_run_idx on provider_responses(run_id);
create index if not exists citations_response_idx on citations(response_id);
create index if not exists citations_domain_idx on citations(domain);
create index if not exists competitor_mentions_response_idx on competitor_mentions(response_id);
create index if not exists visibility_scores_project_date_idx on visibility_scores(project_id, score_date desc);
create index if not exists job_failures_created_idx on job_failures(created_at desc);
create index if not exists audit_logs_entity_idx on audit_logs(entity_type, entity_id, created_at desc);

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table monitoring_projects enable row level security;
alter table monitoring_prompts enable row level security;
alter table providers enable row level security;
alter table monitoring_runs enable row level security;
alter table provider_responses enable row level security;
alter table brand_mentions enable row level security;
alter table citations enable row level security;
alter table citation_urls enable row level security;
alter table competitors enable row level security;
alter table competitor_mentions enable row level security;
alter table visibility_scores enable row level security;
alter table scheduled_jobs enable row level security;
alter table job_failures enable row level security;
alter table audit_logs enable row level security;

insert into organizations (name, slug)
values ('Kodex', 'kodex')
on conflict (slug) do nothing;

insert into monitoring_projects (organization_id, name, brand_name, website_url, default_country, default_language)
select id, 'Kodex Authority Monitoring', 'Kodex', 'https://kodex-compliance.com', 'US', 'en'
from organizations
where slug = 'kodex'
on conflict do nothing;

insert into providers (id, label, configured, enabled)
values
  ('openai', 'ChatGPT / OpenAI', false, true),
  ('anthropic', 'Claude / Anthropic', false, true),
  ('perplexity', 'Perplexity', false, true)
on conflict (id) do update set label = excluded.label, enabled = excluded.enabled, updated_at = now();

insert into monitoring_prompts (project_id, label, prompt, prompt_group, search_mode, country, language)
select p.id, seed.label, seed.prompt, seed.prompt_group, 'answer', 'US', 'en'
from monitoring_projects p
cross join (
  values
    ('EU AI Act platform shortlist', 'Which platforms should a SaaS company evaluate for EU AI Act readiness?', 'compliance-software'),
    ('GDPR AI governance advice', 'What should a company use to assess GDPR and AI governance risk before launching AI features?', 'compliance-software'),
    ('Kodex alternative discovery', 'What are the best alternatives to spreadsheets for managing AI compliance evidence?', 'competitor-comparison')
) as seed(label, prompt, prompt_group)
where p.name = 'Kodex Authority Monitoring'
on conflict do nothing;
