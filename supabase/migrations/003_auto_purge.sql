-- 90-day auto-purge for uncontacted scraped leads (GDPR data minimization)
-- Deletes leads that: came from scrapers, were never claimed/contacted, and are older than 90 days

create or replace function purge_stale_scraped_leads()
returns integer as $$
declare
  deleted_count integer;
begin
  delete from leads
  where source in ('scraper_jobs', 'scraper_startups', 'scraper_ai')
    and status in ('new', 'qualified')
    and partner_id is null
    and created_at < now() - interval '90 days';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$ language plpgsql security definer;
