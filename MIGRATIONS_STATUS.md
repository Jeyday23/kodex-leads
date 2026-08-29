# Database migrations and runtime verification

Kodex uses Supabase/PostgreSQL migrations under `supabase/migrations/`.

## Important

The repository can prove which migrations **exist**, but it cannot prove which migrations have been applied to the connected Supabase project. Do not treat this file as a live database-status report.

For live readiness, open `/admin/authority/settings` and run the non-publishing safety preflight. If Supabase credentials are detected but the Authority settings table cannot be read, verify the migration history and service-role access in Supabase.

## Migrations in this repository

| Migration | Purpose |
| --- | --- |
| `010_seo_engine.sql` | Core SEO/content/lead tables |
| `011_authority_engine.sql` | Authority monitoring and source management |
| `012_authority_operational_modules.sql` | Editorial and knowledge modules |
| `013_opportunity_intelligence_completion.sql` | Opportunity discovery/decision data |
| `014_autonomous_ranking_engine.sql` | Autonomy policy, content lifecycle and ranking engine |
| `015_leads_schema_repair.sql` | Lead schema compatibility repair |
| `016_legacy_leads_company_compat.sql` | Legacy company-field compatibility |
| `017_leads_source_constraint_compat.sql` | Lead source constraint compatibility |
| `018_regulatory_trigger_leads.sql` | Regulatory-trigger discovered leads and enrichment fields |
| `019_discovered_lead_dedupe.sql` | Cross-run discovered-lead idempotency/dedupe trigger |

## Runtime requirements

The autonomous regulatory lead path expects the SEO base schema plus `018_regulatory_trigger_leads.sql`. Apply `019_discovered_lead_dedupe.sql` to enable database-side cross-run dedupe. The application also performs local/package-level dedupe, so duplicate approval packages remain suppressed if migration 019 has not yet been applied.

The Authority autonomy controls depend on the tables introduced by migrations 011–014. The Settings page reports whether the live `authority_automation_settings` table is readable rather than guessing from repository state.

## Verify in Supabase

Use the Supabase SQL Editor or CLI against the intended project. A quick table check is:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'authority_automation_settings',
    'authority_content_assets',
    'discovered_leads',
    'seo_audit_events'
  )
order by table_name;
```

For migration 019 specifically:

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'discovered_leads'
  and column_name = 'lead_key';
```

If `lead_key` is present, also verify the trigger:

```sql
select trigger_name
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table = 'discovered_leads'
  and trigger_name = 'discovered_leads_dedupe_before_insert';
```

Never paste Supabase service-role keys into the browser UI. Server secrets belong in the Render environment.
