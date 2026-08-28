alter table public.leads add column if not exists company_name text;
alter table public.leads add column if not exists company text;
alter table public.leads add column if not exists framework text;
alter table public.leads add column if not exists company_size text;
alter table public.leads add column if not exists ai_use text;
alter table public.leads add column if not exists compliance_maturity text;
alter table public.leads add column if not exists urgency text;
alter table public.leads add column if not exists lead_score integer not null default 0;
alter table public.leads add column if not exists lead_grade text;
alter table public.leads add column if not exists recommended_action text;
alter table public.leads add column if not exists source text not null default 'seo';
alter table public.leads add column if not exists landing_page text;
alter table public.leads add column if not exists content_id uuid;
alter table public.leads add column if not exists search_query_cluster text;
alter table public.leads add column if not exists first_touch_at timestamptz;
alter table public.leads add column if not exists last_touch_at timestamptz;
alter table public.leads add column if not exists created_at timestamptz not null default now();

update public.leads
set company = coalesce(company, company_name, email)
where company is null;

alter table public.leads alter column company drop not null;

alter table public.leads drop constraint if exists leads_source_check;
alter table public.leads
  add constraint leads_source_check
  check (source in ('seo', 'assessment', 'signup', 'manual', 'partner', 'import', 'api'));

create index if not exists leads_content_id_idx on public.leads(content_id);
create index if not exists leads_landing_page_idx on public.leads(landing_page);

notify pgrst, 'reload schema';
