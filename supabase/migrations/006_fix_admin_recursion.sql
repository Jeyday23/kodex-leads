-- Fix infinite recursion in admin RLS policies.
-- The partners_admin_all policy queries partners from within its own RLS,
-- triggering PostgreSQL error 42P17. A SECURITY DEFINER function bypasses
-- RLS for the admin check.

create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from partners
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Partners: replace self-referencing admin policy
drop policy if exists "partners_admin_all" on partners;
create policy "partners_admin_all" on partners
  for all using (is_admin());

-- Leads: replace admin policy
drop policy if exists "leads_admin_all" on leads;
create policy "leads_admin_all" on leads
  for all using (is_admin());

-- Conversions: replace admin policy
drop policy if exists "conversions_admin_all" on conversions;
create policy "conversions_admin_all" on conversions
  for all using (is_admin());

-- Lead events: replace admin policy
drop policy if exists "lead_events_admin_all" on lead_events;
create policy "lead_events_admin_all" on lead_events
  for all using (is_admin());

-- Scrape runs: replace admin policy
drop policy if exists "scrape_runs_admin_only" on scrape_runs;
create policy "scrape_runs_admin_only" on scrape_runs
  for all using (is_admin());

-- Contacts: replace admin policy
drop policy if exists "contacts_admin_all" on contacts;
create policy "contacts_admin_all" on contacts
  for all using (is_admin());
