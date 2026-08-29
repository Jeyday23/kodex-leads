alter table public.discovered_leads
  add column if not exists lead_key text;

do $$ begin
  alter table public.discovered_leads
    add constraint discovered_leads_lead_key_unique unique (lead_key);
exception
  when duplicate_object then null;
end $$;

create index if not exists discovered_leads_lead_key_idx
  on public.discovered_leads(lead_key)
  where lead_key is not null;

notify pgrst, 'reload schema';
