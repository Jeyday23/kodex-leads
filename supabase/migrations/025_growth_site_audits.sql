-- Growth Engine WS2: site audits (Lighthouse/PSI, technical, GEO checklist,
-- site-files). One row per (url, kind, measured_at) run; the API/UI read the
-- latest row per kind and a trend series over the last N days per history.ts.

create table if not exists growth_site_audits (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  kind text not null check (kind in ('lighthouse', 'technical', 'geo', 'site_files')),
  device text check (device in ('mobile', 'desktop')),
  score numeric,
  payload jsonb not null default '{}',
  issues jsonb not null default '[]',
  measured_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists growth_site_audits_url_kind_measured_idx
  on growth_site_audits (url, kind, measured_at desc);

alter table growth_site_audits enable row level security;

do $$ declare
  t text;
begin
  foreach t in array array[
    'growth_site_audits'
  ] loop
    execute format('drop policy if exists %I on %I', t || '_service_role_all', t);
    execute format('create policy %I on %I for all using (auth.role() = ''service_role'') with check (auth.role() = ''service_role'')', t || '_service_role_all', t);
    execute format('drop policy if exists %I on %I', t || '_admin_all', t);
    execute format('create policy %I on %I for all using (exists (select 1 from profiles p where p.id = auth.uid() and lower(p.role) in (''admin'', ''administrator'', ''owner'', ''founder''))) with check (exists (select 1 from profiles p where p.id = auth.uid() and lower(p.role) in (''admin'', ''administrator'', ''owner'', ''founder'')))', t || '_admin_all', t);
  end loop;
end $$;
