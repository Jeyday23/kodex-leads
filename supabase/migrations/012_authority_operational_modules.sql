do $$ begin
  create type authority_opportunity_status as enum ('active', 'queued', 'in_progress', 'merged', 'ignored', 'archived');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type authority_editorial_status as enum ('proposed', 'researching', 'drafting', 'legal review', 'compliance review', 'approved', 'ready for publication', 'rejected', 'archived');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type authority_knowledge_status as enum ('unverified', 'verified', 'changed', 'superseded', 'rejected');
exception when duplicate_object then null;
end $$;

create table if not exists authority_opportunities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references monitoring_projects(id) on delete cascade,
  query text not null,
  normalized_query text not null,
  description text,
  framework text,
  topic_cluster text not null default 'General',
  intent text not null default 'Unknown',
  buyer_stage text not null default 'Unknown',
  country text not null default 'DE',
  language text not null default 'en',
  source text not null default 'internal',
  source_reference text,
  search_demand_value numeric,
  search_demand_label text not null default 'Unknown',
  demand_source text not null default 'unknown',
  demand_integrity text not null default 'unknown',
  competition_score integer not null default 0 check (competition_score between 0 and 100),
  regulatory_urgency_score integer not null default 0 check (regulatory_urgency_score between 0 and 100),
  product_relevance_score integer not null default 0 check (product_relevance_score between 0 and 100),
  buyer_intent_score integer not null default 0 check (buyer_intent_score between 0 and 100),
  llm_visibility_gap_score integer not null default 0 check (llm_visibility_gap_score between 0 and 100),
  competitor_gap_score integer not null default 0 check (competitor_gap_score between 0 and 100),
  content_feasibility_score integer not null default 0 check (content_feasibility_score between 0 and 100),
  priority_score integer not null default 0 check (priority_score between 0 and 100),
  recommended_decision text not null default 'Research',
  current_decision text not null default 'Research',
  existing_content_id uuid references content_pages(id) on delete set null,
  duplicate_of uuid references authority_opportunities(id) on delete set null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  status authority_opportunity_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, normalized_query, country, language)
);

create table if not exists authority_opportunity_sources (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references authority_opportunities(id) on delete cascade,
  source text not null,
  source_reference text,
  evidence jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists authority_discovery_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references monitoring_projects(id) on delete cascade,
  idempotency_key text unique not null,
  run_type text not null default 'manual',
  scheduled_start_at timestamptz,
  actual_start_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running',
  items_processed integer not null default 0,
  items_created integer not null default 0,
  items_updated integer not null default 0,
  items_skipped integer not null default 0,
  provider_failures jsonb not null default '[]',
  duration_ms integer,
  error_summary text,
  created_at timestamptz not null default now()
);

create table if not exists authority_discovery_run_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references authority_discovery_runs(id) on delete cascade,
  opportunity_id uuid references authority_opportunities(id) on delete set null,
  normalized_query text not null,
  action text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists authority_keyword_metrics (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references authority_opportunities(id) on delete cascade,
  metric_date date not null default current_date,
  demand_value numeric,
  demand_label text not null default 'Unknown',
  demand_source text not null,
  integrity text not null default 'unknown',
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists authority_opportunity_decisions (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references authority_opportunities(id) on delete cascade,
  decision text not null,
  reason text,
  actor text,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists authority_opportunity_duplicates (
  id uuid primary key default gen_random_uuid(),
  canonical_opportunity_id uuid references authority_opportunities(id) on delete cascade,
  duplicate_opportunity_id uuid references authority_opportunities(id) on delete cascade,
  similarity_score numeric not null default 1,
  reason text,
  created_at timestamptz not null default now(),
  unique(canonical_opportunity_id, duplicate_opportunity_id)
);

create table if not exists authority_editorial_items (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references authority_opportunities(id) on delete set null,
  title text not null,
  content_type text not null default 'article',
  framework text,
  target_audience text,
  primary_query text,
  supporting_queries text[] not null default '{}',
  commercial_intent text,
  status authority_editorial_status not null default 'proposed',
  draft_content text,
  unsupported_claims jsonb not null default '[]',
  publish_ready boolean not null default false,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists authority_editorial_briefs (
  id uuid primary key default gen_random_uuid(),
  editorial_item_id uuid references authority_editorial_items(id) on delete cascade,
  brief jsonb not null default '{}',
  outline text,
  created_at timestamptz not null default now()
);

create table if not exists authority_editorial_revisions (
  id uuid primary key default gen_random_uuid(),
  editorial_item_id uuid references authority_editorial_items(id) on delete cascade,
  revision_number integer not null,
  content text not null,
  citations jsonb not null default '[]',
  unsupported_claims jsonb not null default '[]',
  created_by text,
  created_at timestamptz not null default now(),
  unique(editorial_item_id, revision_number)
);

create table if not exists authority_editorial_reviews (
  id uuid primary key default gen_random_uuid(),
  editorial_item_id uuid references authority_editorial_items(id) on delete cascade,
  review_type text not null,
  decision text not null,
  notes text,
  reviewer text,
  created_at timestamptz not null default now()
);

create table if not exists authority_editorial_sources (
  id uuid primary key default gen_random_uuid(),
  editorial_item_id uuid references authority_editorial_items(id) on delete cascade,
  knowledge_source_id uuid,
  source_url text,
  supported_claim text,
  created_at timestamptz not null default now()
);

create table if not exists authority_editorial_assignments (
  id uuid primary key default gen_random_uuid(),
  editorial_item_id uuid references authority_editorial_items(id) on delete cascade,
  assignee text not null,
  role text not null,
  created_at timestamptz not null default now()
);

create table if not exists authority_knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_organization text not null,
  source_type text not null,
  jurisdiction text,
  framework text,
  official_url text not null,
  publication_date date,
  effective_date date,
  last_checked_at timestamptz,
  content_hash text,
  verification_status authority_knowledge_status not null default 'unverified',
  superseded boolean not null default false,
  summary text,
  extracted_obligations jsonb not null default '[]',
  applicability text,
  citations jsonb not null default '[]',
  created_by text,
  reviewed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(official_url, content_hash)
);

create table if not exists authority_knowledge_versions (
  id uuid primary key default gen_random_uuid(),
  knowledge_source_id uuid references authority_knowledge_sources(id) on delete cascade,
  content_hash text not null,
  retrieved_at timestamptz not null default now(),
  snapshot text,
  change_summary text,
  created_at timestamptz not null default now(),
  unique(knowledge_source_id, content_hash)
);

create table if not exists authority_knowledge_obligations (
  id uuid primary key default gen_random_uuid(),
  knowledge_source_id uuid references authority_knowledge_sources(id) on delete cascade,
  obligation text not null,
  applies_to text,
  deadline date,
  evidence_requirement text,
  created_at timestamptz not null default now()
);

create table if not exists authority_knowledge_links (
  id uuid primary key default gen_random_uuid(),
  knowledge_source_id uuid references authority_knowledge_sources(id) on delete cascade,
  opportunity_id uuid references authority_opportunities(id) on delete cascade,
  editorial_item_id uuid references authority_editorial_items(id) on delete cascade,
  relationship text not null default 'supports',
  created_at timestamptz not null default now()
);

create table if not exists authority_knowledge_reviews (
  id uuid primary key default gen_random_uuid(),
  knowledge_source_id uuid references authority_knowledge_sources(id) on delete cascade,
  reviewer text,
  decision text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists authority_notifications (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  severity text not null default 'info',
  title text not null,
  body text,
  entity_type text,
  entity_id text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists authority_idempotency_keys (
  key text primary key,
  operation text not null,
  response jsonb,
  created_at timestamptz not null default now()
);

create index if not exists authority_opportunities_active_idx on authority_opportunities(status, priority_score desc) where status = 'active';
create index if not exists authority_opportunities_framework_idx on authority_opportunities(framework);
create index if not exists authority_opportunities_normalized_idx on authority_opportunities(normalized_query);
create index if not exists authority_opportunities_country_language_idx on authority_opportunities(country, language);
create index if not exists authority_discovery_runs_created_idx on authority_discovery_runs(created_at desc);
create index if not exists authority_discovery_runs_status_idx on authority_discovery_runs(status);
create index if not exists authority_keyword_metrics_source_idx on authority_keyword_metrics(demand_source, integrity);
create index if not exists authority_editorial_status_idx on authority_editorial_items(status, updated_at desc);
create index if not exists authority_knowledge_verification_idx on authority_knowledge_sources(verification_status, framework);
create index if not exists authority_notifications_unread_idx on authority_notifications(read_at, created_at desc);

alter table authority_opportunities enable row level security;
alter table authority_opportunity_sources enable row level security;
alter table authority_discovery_runs enable row level security;
alter table authority_discovery_run_items enable row level security;
alter table authority_keyword_metrics enable row level security;
alter table authority_opportunity_decisions enable row level security;
alter table authority_opportunity_duplicates enable row level security;
alter table authority_editorial_items enable row level security;
alter table authority_editorial_briefs enable row level security;
alter table authority_editorial_revisions enable row level security;
alter table authority_editorial_reviews enable row level security;
alter table authority_editorial_sources enable row level security;
alter table authority_editorial_assignments enable row level security;
alter table authority_knowledge_sources enable row level security;
alter table authority_knowledge_versions enable row level security;
alter table authority_knowledge_obligations enable row level security;
alter table authority_knowledge_links enable row level security;
alter table authority_knowledge_reviews enable row level security;
alter table authority_notifications enable row level security;
alter table authority_idempotency_keys enable row level security;

insert into competitors (project_id, name, website_url, active)
select p.id, seed.name, seed.url, true
from monitoring_projects p
cross join (
  values
    ('Vanta', 'https://www.vanta.com'),
    ('Drata', 'https://drata.com'),
    ('Secureframe', 'https://secureframe.com'),
    ('OneTrust', 'https://www.onetrust.com'),
    ('DataGuard', 'https://www.dataguard.com'),
    ('heyData', 'https://heydata.eu')
) as seed(name, url)
where p.name = 'Kodex Authority Monitoring'
on conflict (project_id, name) do update set website_url = excluded.website_url, active = true;

insert into monitoring_prompts (project_id, label, prompt, prompt_group, search_mode, country, language)
select p.id, seed.label, seed.prompt, seed.prompt_group, 'answer', seed.country, seed.language
from monitoring_projects p
cross join (
  values
    ('EU AI Act compliance software', 'What is the best EU AI Act compliance software for European SaaS companies?', 'EU AI Act', 'DE', 'en'),
    ('Article 50 compliance checklist', 'What should an Article 50 AI Act compliance checklist include?', 'EU AI Act', 'DE', 'en'),
    ('Chatbot AI disclosure', 'Does my chatbot need an AI disclosure in the European Union?', 'AI transparency', 'EU', 'en'),
    ('German AI disclosure requirements', 'Welche KI Transparenzpflichten gelten fuer Chatbots in Deutschland?', 'AI transparency', 'DE', 'de'),
    ('Vanta alternatives Europe', 'What are the best Vanta alternatives for European compliance teams?', 'Comparison', 'DE', 'en'),
    ('NIS2 evidence Germany', 'What evidence do German SaaS companies need for NIS2 readiness?', 'NIS2', 'DE', 'en')
) as seed(label, prompt, prompt_group, country, language)
where p.name = 'Kodex Authority Monitoring'
on conflict do nothing;
