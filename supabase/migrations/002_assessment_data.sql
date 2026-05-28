-- Add assessment data support to leads table
-- Stores quiz answers and computed risk level from interactive tools

alter table leads
  drop constraint leads_source_check;

alter table leads
  add constraint leads_source_check
  check (source in (
    'organic', 'checklist', 'scraper_jobs', 'scraper_startups', 'scraper_ai',
    'referral', 'assessment_eu_ai_act', 'assessment_gdpr', 'assessment_frameworks'
  ));

alter table leads
  add column assessment_data jsonb;

-- Allow assessment_submit as a valid event type
alter table lead_events
  drop constraint lead_events_event_type_check;

alter table lead_events
  add constraint lead_events_event_type_check
  check (event_type in (
    'form_submit', 'scan_complete', 'demo_booked', 'email_sent',
    'upgraded', 'score_changed', 'assessment_submit'
  ));

create index idx_leads_assessment on leads using gin (assessment_data) where assessment_data is not null;
