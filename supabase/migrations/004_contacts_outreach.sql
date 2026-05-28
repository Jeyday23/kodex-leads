-- Outbound prospecting: contacts table + outreach status on leads

-- ============================================================
-- CONTACTS (decision makers at target companies)
-- ============================================================
create table contacts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  name text not null,
  title text not null,
  email text,
  linkedin_url text,
  phone text,
  enrichment_source text check (enrichment_source in ('apollo', 'hunter', 'dropcontact', 'manual')),
  created_at timestamptz not null default now()
);

alter table contacts enable row level security;

-- Partners see contacts for leads they own OR unclaimed qualified leads
create policy "contacts_partner_view" on contacts
  for select using (
    exists (
      select 1 from leads
      where leads.id = contacts.lead_id
        and (leads.partner_id = auth.uid() or (leads.partner_id is null and leads.status = 'qualified'))
    )
  );

-- Admin sees all contacts
create policy "contacts_admin_all" on contacts
  for all using (
    exists (select 1 from partners where id = auth.uid() and role = 'admin')
  );

create index idx_contacts_lead on contacts(lead_id);
create index idx_contacts_email on contacts(email) where email is not null;

-- ============================================================
-- OUTREACH STATUS on leads
-- ============================================================
alter table leads
  add column outreach_status text not null default 'not_contacted'
  check (outreach_status in (
    'not_contacted', 'emailed', 'replied', 'meeting_booked', 'converted', 'not_interested'
  ));

create index idx_leads_outreach on leads(outreach_status);

-- Partners can update outreach_status on their own claimed leads
create policy "leads_partner_outreach" on leads
  for update using (partner_id = auth.uid())
  with check (partner_id = auth.uid());
