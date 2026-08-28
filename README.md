# Kodex Leads SEO Working Copy

This is a build-ready scaffold derived from the verified architecture of the private `Jeyday23/kodex-leads` repository. It is not an exact repository export because the private GitHub connector did not expose archive download access.

## Existing verified foundation
- Next.js 16 App Router
- React 19
- Supabase database and authentication
- Lead assessments and scoring
- HubSpot, Slack, Stripe and PostHog integrations
- Scheduled lead scraping and enrichment

## Added SEO system scaffold
- Dynamic compliance knowledge routes
- SEO intelligence cron endpoint
- Content quality gates
- Search and conversion attribution schema
- Sitemap and robots placeholders
- Regulatory source ingestion modules

See `docs/KODEX_SEO_SYSTEM_SPEC.md` and the accompanying PDF.

## Implemented SEO routes
- `/learn/[framework]/[slug]`
- `/compare/[slug]`
- `/deadlines/[framework]`
- `/enforcement/[framework]/[slug]`

The app reads from Supabase when `NEXT_PUBLIC_SUPABASE_URL` and a Supabase key are present. Without those variables it serves a small seed inventory so metadata, sitemap, robots and quality behavior can still be verified locally.

## Automation endpoints
- `GET /api/seo/cron` requires `Authorization: Bearer $CRON_SECRET` and evaluates pending pages through the quality gate.
- `POST /api/seo/attribution` normalizes landing-page attribution and can persist it to a lead when a `leadId` is supplied.
- `POST /api/leads` captures SEO assessment leads, scores them, stores attribution and persists to Supabase when configured.
- `GET /api/seo/llm-sync` requires `Authorization: Bearer $CRON_SECRET` and runs ChatGPT/OpenAI, Claude and Perplexity visibility checks when their credentials are configured.
- `GET /api/seo/ai-sitemap` exposes canonical SEO page data for AI retrieval and monitoring workflows.
- `GET /llms.txt` exposes a plain-text LLM discovery file.

## Operating views
- `/admin/seo` shows publication status, quality decisions and indexing readiness.
- `/admin/leads` shows captured SEO leads, lead score, recommended action and routing status.
- `/assess/seo` captures and scores leads from SEO journeys.
- `/admin/authority` shows LLM citation monitoring, prompt status, providers, competitors, history and failures.

## Automation environment
- `CRON_SECRET` is required for `/api/seo/cron`; the route fails closed if it is missing.
- `SEO_SOURCE_FETCH_ENABLED=true` enables live official-source fetch and hashing in the cron cycle.
- `GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL` and `GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY` mark Search Console ingestion as configured.
- `SLACK_WEBHOOK_URL` routes high-scoring leads to Slack when configured.
- `HUBSPOT_PRIVATE_APP_TOKEN` creates high-scoring contacts in HubSpot when configured.
- `OPENAI_API_KEY` and `OPENAI_MODEL` enable ChatGPT/OpenAI answer-engine analysis through the Responses API.
- `ANTHROPIC_API_KEY` and `CLAUDE_MODEL` enable Claude analysis through the Messages API.
- `PERPLEXITY_API_KEY` and `PERPLEXITY_MODEL` enable Perplexity analysis through its OpenAI-compatible endpoint.

## Authority Engine

The Authority Engine runs inside the existing Next.js app, Render deployment, and Supabase project.

- `GET /api/authority/health` returns provider configuration status without exposing secrets.
- `GET /api/authority/cron` and `POST /api/authority/monitoring/run` require `Authorization: Bearer $CRON_SECRET`.
- `GET/POST/PATCH /api/authority/prompts` lists and manages monitoring prompts; write operations require `CRON_SECRET`.
- `supabase/migrations/011_authority_engine.sql` creates monitoring projects, prompts, runs, provider responses, citations, competitors, visibility scores, scheduled jobs, failures, and audit logs with RLS enabled.
- `supabase/migrations/012_authority_operational_modules.sql` adds Opportunities, Editorial, Knowledge, notifications, idempotency keys and discovery-run history.
- `render.yaml` documents the existing Render web service plus Authority Engine workers and scheduled jobs using the existing environment variable names.

### Authority modules

- Command: `/admin/authority/command` summarizes status, priority actions, provider availability and recent warnings.
- Opportunities: `/admin/authority/opportunities` runs discovery, scores questions, records demand integrity and drives Build, Expand, Merge, Research and Ignore decisions.
- Editorial: `/admin/authority/editorial` tracks controlled briefs, drafts, revisions and approval gates. It never publishes automatically.
- Knowledge: `/admin/authority/knowledge` stores official and verified sources, versions, obligations and verification history.
- Observatory: `/admin/authority/observatory` contains the existing LLM citation monitoring work, including runs, citations, competitors, history and failures.

### Security model

Authority pages require a Supabase-authenticated admin profile. API routes require an admin session, except Render automation may use `Authorization: Bearer $CRON_SECRET` on job endpoints. Provider API keys are read only in server-only modules and are never returned by settings or health endpoints.

### Automation schedule

Render cron jobs are configured for daily lightweight discovery, weekly discovery refresh, daily LLM monitoring, weekly visibility recalculation, hourly retry and daily source-verification readiness. Manual dashboard buttons call the same backend pipelines as scheduled jobs.

### Demand integrity

Demand numbers are not invented. Numeric demand values are shown only when a named measured source is stored. Otherwise the UI shows labels such as `High`, `Medium` or `Unknown` with integrity marked as `modeled` or `unknown`.

### Migration and rollback

Apply migrations in order:

```bash
supabase migration up
```

Rollback requires restoring the database from the Supabase backup taken before applying `011_authority_engine.sql` and `012_authority_operational_modules.sql`, then reverting the deployment to the previous Render build. No Authority Engine job publishes public content, so rollback is limited to internal tables, workers and dashboard routes.

## Local working mode
When Supabase is not configured, captured leads and cron audit events are saved to `.data/seo-store.json`. This makes the demo fully usable locally while preserving the production path to Supabase.
