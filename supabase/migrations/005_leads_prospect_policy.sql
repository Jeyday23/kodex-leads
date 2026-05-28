-- Allow authenticated partners to see unclaimed qualified leads (prospecting feed)
-- This replaces adminClient usage in the dashboard page
create policy "leads_prospect_view" on leads
  for select using (
    partner_id is null
    and status = 'qualified'
    and auth.uid() is not null
  );
