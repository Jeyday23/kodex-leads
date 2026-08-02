# Codex Master Build Prompt: Kodex Search & LLM Authority Engine

## Mission

Extend this repository into a fully functional internal LLM citation monitoring dashboard. Build on the existing staging implementation. Do not create a disconnected application and do not replace working lead-generation, SEO, Supabase, authentication, or provider integrations.

The target base branch is `staging`.

## Existing foundation to preserve

This repository already contains:

- Next.js 16 App Router and React 19
- Supabase database and authentication
- Existing SEO administration routes
- `GET /api/seo/llm-sync`, protected by `CRON_SECRET`
- OpenAI, Anthropic and Perplexity provider adapters
- Existing Supabase persistence helpers
- Existing local fallback behavior for development

Inspect the repository before changing code. Reuse existing modules wherever practical, especially:

- `app/api/seo/llm-sync/route.ts`
- `lib/seo/llm-automation.ts`
- `lib/seo/llm-providers.ts`
- `lib/seo/db.ts`
- existing Supabase migrations and admin UI patterns

## Environment and secret policy

Use the standing deployment environment variables already configured in Render and Supabase. Never copy secret values into source code, documentation, logs, client bundles, test fixtures, commits, issues, or pull requests.

Reuse these existing variable names:

- `NEXT_PUBLIC_SUPABASE_URL`
- the existing server-side Supabase key variable already used by `lib/seo/db.ts`
- `CRON_SECRET`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `ANTHROPIC_API_KEY`
- `CLAUDE_MODEL`
- `PERPLEXITY_API_KEY`
- `PERPLEXITY_MODEL`

Requirements:

1. Read secrets only from `process.env` in server-only code.
2. Do not introduce new aliases for existing credentials.
3. Fail closed when required secrets are unavailable.
4. Display only configured/not-configured status in the dashboard.
5. Never return secret values from an API route.
6. Do not expose provider keys through `NEXT_PUBLIC_*` variables.
7. Preserve the current environment configuration in Render. No key rotation is required for this build.

## Product scope

Build the first production phase of the Kodex Search & LLM Authority Engine inside the existing admin area.

Required capabilities:

1. Prompt library
   - create, edit, group, activate, pause and archive monitoring prompts
   - support country, language, topic, framework and intent metadata
   - seed an initial Kodex prompt set

2. Monitoring execution
   - run one prompt manually
   - run a selected group manually
   - execute scheduled provider runs through the existing cron security model
   - query all configured providers independently
   - record skipped and failed providers without failing the whole cycle

3. Immutable answer snapshots
   - persist prompt text, provider, model, answer, citations, latency, estimated cost, country, language and timestamp
   - preserve raw provider response server-side where permitted
   - never overwrite historical run records

4. Mention and citation extraction
   - detect Kodex, Kodex Compliance and configured aliases
   - detect direct URL citations and unlinked brand mentions
   - extract citation URL, title, domain and position
   - detect configured competitors
   - assign extraction confidence and recommendation strength

5. Dashboard
   - overview with mention rate, citation rate, visibility score, provider coverage and changes over time
   - prompt library
   - monitoring runs
   - answer detail view
   - citations and cited domains
   - competitor comparison
   - failures and retries
   - settings and provider configuration status

6. Operational controls
   - idempotency for scheduled runs
   - retries with bounded exponential backoff
   - structured errors
   - audit logging for prompt and setting changes
   - health endpoint
   - pagination and date filters

## Architectural boundary

This phase is an internal monitoring capability only.

Do not:

- connect to the Kodex customer application database
- modify customer records
- publish content automatically
- edit `kodex-compliance.com`
- crawl authenticated pages
- place API keys in the database
- merge directly into `main`

## Implementation sequence

1. Audit current staging architecture and document reused modules.
2. Add the database migration described in `01-IMPLEMENTATION-SPEC.md`.
3. Refactor the existing provider flow behind a stable monitoring-provider interface without breaking `/api/seo/llm-sync`.
4. Add prompt management and monitoring services.
5. Add extraction and scoring services.
6. Add admin routes and components using the current visual system.
7. Add the scheduled execution endpoint and Render configuration only where needed.
8. Add tests and seed data.
9. Run lint, typecheck, tests and production build.
10. Open a pull request into `staging` with migration, deployment and rollback notes.

## Definition of done

The work is complete only when every acceptance test in `02-ACCEPTANCE-TESTS.md` passes. A static dashboard, mocked-only implementation, or UI without persisted provider runs is not complete.
