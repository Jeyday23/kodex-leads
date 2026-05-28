-- Kodex Leads — Initial Schema
-- 5 tables: partners, leads, conversions, lead_events, scrape_runs

-- ============================================================
-- PARTNERS
-- ============================================================
create table partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  code text unique not null,
  commission_rate decimal not null default 0.15,
  slack_handle text,
  role text not null default 'partner' check (role in ('partner', 'admin')),
  status text not null default 'active' check (status in ('active', 'paused', 'inactive')),
  created_at timestamptz not null default now()
);

alter table partners enable row level security;

create policy "partners_own_row" on partners
  for select using (auth.uid() = id);

create policy "partners_admin_all" on partners
  for all using (
    exists (select 1 from partners where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- LEADS
-- ============================================================
create table leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  company text not null,
  team_size text check (team_size in ('1-10', '11-50', '51-200', '200+')),
  uses_ai boolean not null default false,
  funding_stage text default 'unknown' check (funding_stage in ('pre-seed', 'seed', 'series-a', 'series-b', 'unknown')),
  source text not null check (source in ('organic', 'checklist', 'scraper_jobs', 'scraper_startups', 'scraper_ai', 'referral')),
  source_url text,
  scrape_batch_id uuid,
  score integer not null default 0,
  status text not null default 'new' check (status in ('new', 'qualified', 'claimed', 'contacted', 'demo_booked', 'converted', 'lost')),
  partner_id uuid references partners(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table leads enable row level security;

create policy "leads_partner_own" on leads
  for select using (partner_id = auth.uid());

create policy "leads_partner_update" on leads
  for update using (partner_id = auth.uid())
  with check (partner_id = auth.uid());

create policy "leads_admin_all" on leads
  for all using (
    exists (select 1 from partners where id = auth.uid() and role = 'admin')
  );

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger leads_updated_at
  before update on leads
  for each row execute function update_updated_at();

-- ============================================================
-- CONVERSIONS
-- ============================================================
create table conversions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id),
  partner_id uuid not null references partners(id),
  stripe_session_id text unique not null,
  stripe_customer_id text,
  plan text not null check (plan in ('starter', 'pro')),
  mrr decimal not null,
  commission_amount decimal not null,
  paid_out boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table conversions enable row level security;

create policy "conversions_partner_own" on conversions
  for select using (partner_id = auth.uid());

create policy "conversions_admin_all" on conversions
  for all using (
    exists (select 1 from partners where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- LEAD EVENTS
-- ============================================================
create table lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  event_type text not null check (event_type in ('form_submit', 'scan_complete', 'demo_booked', 'email_sent', 'upgraded', 'score_changed')),
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

alter table lead_events enable row level security;

create policy "lead_events_via_lead" on lead_events
  for select using (
    exists (select 1 from leads where leads.id = lead_events.lead_id and leads.partner_id = auth.uid())
  );

create policy "lead_events_admin_all" on lead_events
  for all using (
    exists (select 1 from partners where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- SCRAPE RUNS
-- ============================================================
create table scrape_runs (
  id uuid primary key default gen_random_uuid(),
  scraper_type text not null check (scraper_type in ('jobs', 'startups', 'ai', 'enrich')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  leads_found integer not null default 0,
  leads_qualified integer not null default 0,
  errors jsonb default '[]',
  status text not null default 'running' check (status in ('running', 'completed', 'failed'))
);

alter table scrape_runs enable row level security;

create policy "scrape_runs_admin_only" on scrape_runs
  for all using (
    exists (select 1 from partners where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_leads_status on leads(status);
create index idx_leads_score on leads(score);
create index idx_leads_partner on leads(partner_id);
create index idx_leads_source on leads(source);
create index idx_leads_created on leads(created_at);
create index idx_conversions_partner on conversions(partner_id);
create index idx_lead_events_lead on lead_events(lead_id);
create index idx_scrape_runs_type on scrape_runs(scraper_type);
