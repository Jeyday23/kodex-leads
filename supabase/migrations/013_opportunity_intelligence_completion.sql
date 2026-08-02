alter table authority_opportunities add column if not exists summary text;
alter table authority_opportunities add column if not exists source_type text;
alter table authority_opportunities add column if not exists demand_value numeric;
alter table authority_opportunities add column if not exists demand_label text;
alter table authority_opportunities add column if not exists demand_measurement_type text not null default 'unknown';

update authority_opportunities
set
  summary = coalesce(summary, description),
  source_type = coalesce(source_type, source),
  demand_value = coalesce(demand_value, search_demand_value),
  demand_label = coalesce(demand_label, search_demand_label),
  demand_measurement_type = coalesce(nullif(demand_measurement_type, 'unknown'), demand_integrity, 'unknown')
where summary is null
   or source_type is null
   or demand_label is null;

alter table authority_discovery_runs add column if not exists duplicate_count integer not null default 0;
alter table authority_discovery_runs add column if not exists failures jsonb not null default '[]';
alter table authority_discovery_runs add column if not exists trigger_type text;

update authority_discovery_runs
set
  failures = case
    when provider_failures is null then '[]'::jsonb
    else provider_failures
  end,
  trigger_type = coalesce(trigger_type, run_type)
where trigger_type is null;

create index if not exists authority_opportunities_intent_idx on authority_opportunities(intent);
create index if not exists authority_opportunities_last_seen_idx on authority_opportunities(last_seen_at desc);
create index if not exists authority_opportunities_demand_measurement_idx on authority_opportunities(demand_measurement_type);
create index if not exists authority_discovery_runs_trigger_idx on authority_discovery_runs(trigger_type, created_at desc);
