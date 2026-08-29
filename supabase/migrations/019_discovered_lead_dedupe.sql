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

create or replace function public.kodex_upsert_discovered_lead()
returns trigger
language plpgsql
as $$
declare
  normalized_company text;
begin
  normalized_company := regexp_replace(
    regexp_replace(lower(coalesce(new.company_name, '')), '\m(gmbh|ug|ag|se|ltd|limited|inc|sa|sarl|bv)\M', '', 'gi'),
    '[^a-z0-9]+',
    '',
    'g'
  );
  new.lead_key := md5(normalized_company || '|' || lower(trim(coalesce(new.source_url, ''))));

  update public.discovered_leads
  set
    website = new.website,
    segment = new.segment,
    fit_reason = new.fit_reason,
    suggested_search_intent = new.suggested_search_intent,
    suggested_landing_page = new.suggested_landing_page,
    confidence = greatest(discovered_leads.confidence, new.confidence),
    source = new.source,
    source_url = new.source_url,
    retrieved_at = new.retrieved_at,
    contact_email = coalesce(new.contact_email, discovered_leads.contact_email),
    enrichment_provider = coalesce(new.enrichment_provider, discovered_leads.enrichment_provider),
    trigger_category = coalesce(new.trigger_category, discovered_leads.trigger_category),
    regulatory_framework = coalesce(new.regulatory_framework, discovered_leads.regulatory_framework),
    fine_amount = coalesce(new.fine_amount, discovered_leads.fine_amount),
    decision_maker_name = coalesce(new.decision_maker_name, discovered_leads.decision_maker_name),
    decision_maker_title = coalesce(new.decision_maker_title, discovered_leads.decision_maker_title),
    decision_maker_source = coalesce(new.decision_maker_source, discovered_leads.decision_maker_source),
    outreach_angle = coalesce(new.outreach_angle, discovered_leads.outreach_angle)
  where lead_key = new.lead_key;

  if found then
    return null;
  end if;

  return new;
end;
$$;

drop trigger if exists discovered_leads_dedupe_before_insert on public.discovered_leads;
create trigger discovered_leads_dedupe_before_insert
before insert on public.discovered_leads
for each row execute function public.kodex_upsert_discovered_lead();

notify pgrst, 'reload schema';
