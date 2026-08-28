create table if not exists public.discovered_leads (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  website text,
  segment text not null,
  fit_reason text not null,
  suggested_search_intent text,
  suggested_landing_page text,
  confidence integer not null default 0,
  source text not null,
  source_url text not null,
  retrieved_at timestamptz not null default now(),
  contact_email text,
  enrichment_provider text,
  trigger_category text,
  regulatory_framework text,
  fine_amount text,
  decision_maker_name text,
  decision_maker_title text,
  decision_maker_source text,
  outreach_angle text,
  created_at timestamptz not null default now()
);

alter table public.discovered_leads add column if not exists trigger_category text;
alter table public.discovered_leads add column if not exists regulatory_framework text;
alter table public.discovered_leads add column if not exists fine_amount text;
alter table public.discovered_leads add column if not exists decision_maker_name text;
alter table public.discovered_leads add column if not exists decision_maker_title text;
alter table public.discovered_leads add column if not exists decision_maker_source text;
alter table public.discovered_leads add column if not exists outreach_angle text;
alter table public.discovered_leads add column if not exists contact_email text;
alter table public.discovered_leads add column if not exists enrichment_provider text;
alter table public.discovered_leads add column if not exists retrieved_at timestamptz not null default now();
alter table public.discovered_leads add column if not exists created_at timestamptz not null default now();

alter table public.discovered_leads drop constraint if exists discovered_leads_trigger_category_check;
alter table public.discovered_leads
  add constraint discovered_leads_trigger_category_check
  check (
    trigger_category is null
    or trigger_category in (
      'enforcement_fine',
      'regulatory_exposure',
      'new_company',
      'compliance_hiring',
      'funding',
      'ai_product'
    )
  );

alter table public.discovered_leads drop constraint if exists discovered_leads_confidence_check;
alter table public.discovered_leads
  add constraint discovered_leads_confidence_check check (confidence between 0 and 100);

create index if not exists discovered_leads_created_idx on public.discovered_leads(created_at desc);
create index if not exists discovered_leads_trigger_idx on public.discovered_leads(trigger_category, confidence desc);
create index if not exists discovered_leads_company_idx on public.discovered_leads(lower(company_name));
create index if not exists discovered_leads_source_idx on public.discovered_leads(source, retrieved_at desc);

notify pgrst, 'reload schema';
