create extension if not exists pgcrypto;

do $$ begin
  create type seo_page_type as enum ('learn', 'compare', 'deadline', 'enforcement', 'hub');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type seo_review_status as enum ('draft', 'review', 'approved', 'published', 'rejected', 'archived');
exception
  when duplicate_object then null;
end $$;

create table if not exists seo_topics (
  id uuid primary key default gen_random_uuid(),
  primary_keyword text not null,
  search_intent text not null,
  framework text,
  jurisdiction text,
  language text not null default 'en',
  business_value integer not null default 0,
  target_tool text,
  status text not null default 'planned',
  opportunity_score numeric not null default 0,
  last_scored_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists seo_topics_framework_idx on seo_topics(framework);
create index if not exists seo_topics_status_score_idx on seo_topics(status, opportunity_score desc);

create table if not exists source_documents (
  id uuid primary key default gen_random_uuid(),
  authority text not null,
  source_url text unique not null,
  title text not null,
  published_at timestamptz,
  effective_at timestamptz,
  checked_at timestamptz,
  content_hash text,
  previous_content_hash text,
  extracted_claims jsonb not null default '[]',
  change_summary text,
  last_checked_at timestamptz not null default now()
);

create index if not exists source_documents_authority_idx on source_documents(authority);
create index if not exists source_documents_hash_idx on source_documents(content_hash);

create table if not exists content_pages (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references seo_topics(id),
  slug text not null,
  language text not null default 'en',
  page_type seo_page_type not null,
  title text not null,
  description text not null,
  body jsonb not null,
  framework text,
  jurisdiction text,
  primary_keyword text,
  search_intent text,
  target_tool text,
  quality_score integer not null default 0,
  review_status seo_review_status not null default 'draft',
  legal_interpretation boolean not null default false,
  canonical_url text,
  noindex boolean not null default true,
  reviewed_by text,
  reviewed_at timestamptz,
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint content_pages_quality_score_range check (quality_score between 0 and 100),
  constraint content_pages_publishable_check check (
    review_status <> 'published'
    or (quality_score >= 80 and noindex = false and canonical_url is not null)
  ),
  unique(slug, language)
);

create index if not exists content_pages_route_idx on content_pages(page_type, framework, slug, language);
create index if not exists content_pages_indexable_idx on content_pages(review_status, noindex, published_at desc);
create index if not exists content_pages_topic_idx on content_pages(topic_id);

create table if not exists content_sources (
  content_id uuid references content_pages(id) on delete cascade,
  source_document_id uuid references source_documents(id) on delete cascade,
  supported_claim text not null,
  primary key(content_id, source_document_id, supported_claim)
);

create table if not exists content_links (
  id uuid primary key default gen_random_uuid(),
  source_content_id uuid references content_pages(id) on delete cascade,
  target_content_id uuid references content_pages(id) on delete cascade,
  target_url text,
  anchor_text text not null,
  relationship text not null default 'related',
  created_at timestamptz not null default now(),
  constraint content_links_target_check check (target_content_id is not null or target_url is not null)
);

create index if not exists content_links_source_idx on content_links(source_content_id);

create table if not exists seo_metrics (
  id uuid primary key default gen_random_uuid(),
  content_id uuid references content_pages(id) on delete cascade,
  metric_date date not null,
  search_query text,
  impressions integer not null default 0,
  clicks integer not null default 0,
  average_position numeric,
  assessment_starts integer not null default 0,
  leads integer not null default 0,
  qualified_leads integer not null default 0,
  conversions integer not null default 0,
  revenue numeric not null default 0,
  unique(content_id, metric_date, search_query)
);

create index if not exists seo_metrics_content_date_idx on seo_metrics(content_id, metric_date desc);
create index if not exists seo_metrics_query_idx on seo_metrics(search_query);

create table if not exists seo_audit_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  content_id uuid references content_pages(id) on delete set null,
  source_document_id uuid references source_documents(id) on delete set null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists seo_audit_events_type_time_idx on seo_audit_events(event_type, created_at desc);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  company_name text,
  framework text,
  company_size text,
  ai_use text,
  compliance_maturity text,
  urgency text,
  lead_score integer not null default 0,
  lead_grade text,
  recommended_action text,
  source text not null default 'seo',
  created_at timestamptz not null default now()
);

alter table leads add column if not exists landing_page text;
alter table leads add column if not exists content_id uuid references content_pages(id);
alter table leads add column if not exists search_query_cluster text;
alter table leads add column if not exists first_touch_at timestamptz;
alter table leads add column if not exists last_touch_at timestamptz;
alter table leads add column if not exists lead_score integer not null default 0;
alter table leads add column if not exists lead_grade text;
alter table leads add column if not exists recommended_action text;

create index if not exists leads_content_id_idx on leads(content_id);
create index if not exists leads_landing_page_idx on leads(landing_page);

insert into seo_topics (primary_keyword, search_intent, framework, jurisdiction, business_value, target_tool, status, opportunity_score)
values
  ('llm seo process', 'answer-engine-optimization', 'seo', 'Global', 95, '/assess/seo', 'planned', 85),
  ('google search vs llm discovery', 'comparison', 'seo', 'Global', 90, '/assess/seo', 'planned', 80),
  ('seo automation cadence', 'operations', 'seo', 'Global', 75, '/assess/seo', 'planned', 70)
on conflict do nothing;
