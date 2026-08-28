# Autonomous Ranking Engine Deployment Runbook

This runbook applies to `feature/autonomous-ranking-engine`. Do not merge it into `main` until the controlled production acceptance test succeeds.

## Public Content Flow

The Authority Engine publishes through the existing Supabase-backed public content system:

```text
Authority Engine creates approved content
  -> content is saved in Supabase
  -> public Kodex routes read the content
  -> pages appear on kodex-compliance.com
```

Public routes used by the publishing adapter:

```text
/learn/[framework]/[slug]
/compare/[slug]
/deadlines/[framework]
/enforcement/[framework]/[slug]
```

## Migration Order

Back up Supabase before applying migrations.

Apply migrations in order:

```text
011_authority_engine.sql
012_authority_operational_modules.sql
013_opportunity_intelligence_completion.sql
014_autonomous_ranking_engine.sql
```

After applying `014_autonomous_ranking_engine.sql`, confirm:

- The new content, version, claim, source, approval, quality, publication, audit, Search Console, revision, conversion and outreach tables exist.
- Row Level Security is enabled on internal Authority Engine tables.
- The Render `SUPABASE_SERVICE_ROLE_KEY` can run worker operations.
- Ordinary authenticated users cannot read internal Authority Engine data unless their profile role is `admin`, `administrator`, `owner` or `founder`.

## Render Environment

Keep the existing values in Render. Do not paste secrets into Codex, GitHub, docs or `.env` files.

Confirm Render has:

```text
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
CRON_SECRET
OPENAI_API_KEY
OPENAI_MODEL
ANTHROPIC_API_KEY
CLAUDE_MODEL
PERPLEXITY_API_KEY
PERPLEXITY_MODEL
GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL
GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY
SEO_SOURCE_FETCH_ENABLED
SLACK_WEBHOOK_URL
HUBSPOT_PRIVATE_APP_TOKEN
```

`render.yaml` extends the existing web, worker and scheduled-job setup. It does not replace the Render deployment architecture.

## Google Search Console

To enable real Google performance data, configure:

- A verified Google Search Console property for `kodex-compliance.com`.
- A Google service account with read access to the property.
- `GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL` in Render.
- `GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY` in Render.

Without Search Console, the engine records the integration as unavailable and continues other workflows. It must not create fake ranking metrics.

## Initial Mode

Start in:

```text
draft_only
```

Available modes:

- `off`: monitoring only.
- `draft_only`: discovers, researches and drafts; does not publish.
- `guarded`: publishes only low-risk eligible changes.
- `controlled`: allows broader automation according to approval policy.

Do not begin with autonomous publication enabled.

## Controlled Test

Before scheduled publication, run one real controlled acceptance scenario using a topic like:

```text
Does a SaaS chatbot need an AI disclosure under Article 50?
```

The test must prove:

- Opportunity creation.
- Official source selection.
- Brief and draft generation.
- Claim and evidence storage.
- Quality gate pass.
- Approval request and approval.
- Publication through the real public content adapter.
- Public URL returns HTTP 200.
- Sitemap, canonical, robots and internal-link checks.
- Observatory monitoring across configured providers.
- Baseline metrics storage.
- Revision creation.
- Revision publication.
- Rollback to a previous version.

Run from a configured Render shell or equivalent server environment:

```bash
npx tsx scripts/run-authority-controlled-acceptance.ts
```

The local Codex shell cannot complete this unless it has the same production/staging Supabase and site environment variables.

## Render Schedule

Once the controlled test passes, activate schedules:

```text
04:00  Import Google metrics
05:00  Find opportunities and plan
06:00  Research and create drafts
07:00  Run quality checks
08:00  Queue eligible publications
09:00  Audit published pages
10:00  Run LLM monitoring
Hourly Retry failed jobs
```

Keep `draft_only` until the controlled acceptance result is recorded.

## Rollback

Immediate disable:

```text
Set autopilot mode to off in /admin/authority/settings/automation.
```

Code rollback:

```text
Revert the deployed Render commit or redeploy the previous known-good commit.
```

Content rollback:

```text
Use /admin/authority/content/[id] -> Rollback.
```

Database rollback:

```text
Restore from the Supabase backup taken before migration.
```
