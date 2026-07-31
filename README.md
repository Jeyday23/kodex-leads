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

## Automation environment
- `CRON_SECRET` is required for `/api/seo/cron`; the route fails closed if it is missing.
- `SEO_SOURCE_FETCH_ENABLED=true` enables live official-source fetch and hashing in the cron cycle.
- `GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL` and `GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY` mark Search Console ingestion as configured.
- `SLACK_WEBHOOK_URL` routes high-scoring leads to Slack when configured.
- `HUBSPOT_PRIVATE_APP_TOKEN` creates high-scoring contacts in HubSpot when configured.
- `OPENAI_API_KEY` and `OPENAI_MODEL` enable ChatGPT/OpenAI answer-engine analysis through the Responses API.
- `ANTHROPIC_API_KEY` and `CLAUDE_MODEL` enable Claude analysis through the Messages API.
- `PERPLEXITY_API_KEY` and `PERPLEXITY_MODEL` enable Perplexity analysis through its OpenAI-compatible endpoint.

## Local working mode
When Supabase is not configured, captured leads and cron audit events are saved to `.data/seo-store.json`. This makes the demo fully usable locally while preserving the production path to Supabase.
