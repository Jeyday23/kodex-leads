# Kodex Authority Engine Handoff Package

## Current GitHub State

The work is not visible on the repository default branch because it has not been merged yet.

Current pull requests:

- PR #2: `feature/authority-engine` into `staging`
  - URL: https://github.com/Jeyday23/kodex-leads/pull/2
  - Commit: `929aeacf11fd55400f072998cc35f6009d3fecaf`
  - CI: passed

- PR #3: `feature/seo-opportunity-intelligence` into `staging`
  - URL: https://github.com/Jeyday23/kodex-leads/pull/3
  - Commit: `e816df32ac41d17c3ec45a1dcd33f0e138dec0dc`
  - CI: passed

To see the code in GitHub, switch the branch dropdown from the default branch to:

```text
feature/seo-opportunity-intelligence
```

The normal GitHub file browser on `main` or `staging` will not show these files until the PRs are merged.

## What Was Built

We built the first internal Kodex Search & LLM Authority Engine inside the existing Next.js application. It is not a separate app and it does not use ChatGPT Sites.

The Authority Engine now has these internal modules:

- Command
- Opportunities
- Editorial
- Knowledge
- Observatory

The screenshot was used as a visual reference. The UI was rebuilt with React components and CSS, not embedded as an image.

## Main Internal Routes

Authority shell:

```text
/admin/authority
/admin/authority/command
```

Opportunity Intelligence:

```text
/admin/authority/opportunities
/admin/authority/opportunities/[id]
```

Editorial:

```text
/admin/authority/editorial
/admin/authority/editorial/[id]
```

Knowledge:

```text
/admin/authority/knowledge
/admin/authority/knowledge/[id]
```

Observatory:

```text
/admin/authority/observatory
/admin/authority/observatory/runs
/admin/authority/observatory/runs/[id]
/admin/authority/observatory/citations
/admin/authority/observatory/competitors
/admin/authority/observatory/history
/admin/authority/observatory/failures
```

## What Works Now In Code

### Private Authority Shell

Files:

```text
app/admin/authority/layout.tsx
app/admin/authority/page.tsx
app/admin/authority/command/page.tsx
app/globals.css
lib/authority/auth.ts
lib/authority/status.ts
```

What it does:

- Adds the dark Kodex sidebar.
- Adds module navigation.
- Adds system status.
- Adds current user/role area.
- Protects Authority pages with Supabase session/admin checks.

### Opportunity Intelligence

Files:

```text
app/admin/authority/opportunities/page.tsx
app/admin/authority/opportunities/[id]/page.tsx
app/admin/authority/AuthorityActions.tsx
lib/authority/opportunities.ts
lib/authority/opportunity-scoring.ts
lib/authority/response.ts
```

What it does:

- Displays an operational opportunity table.
- Supports filters for search, framework, intent, country, language, status, source, date, and priority order.
- Supports Run discovery.
- Supports New opportunity.
- Supports Build, Expand, Merge, Research, Ignore, Archive.
- Supports Recalculate.
- Uses backend APIs, not decorative buttons.
- Uses labels for demand unless measured/manual demand data exists.

### Opportunity APIs

Files:

```text
app/api/authority/opportunities/route.ts
app/api/authority/opportunities/discover/route.ts
app/api/authority/opportunities/discovery-runs/route.ts
app/api/authority/opportunities/[id]/route.ts
app/api/authority/opportunities/[id]/decision/route.ts
app/api/authority/opportunities/[id]/merge/route.ts
app/api/authority/opportunities/[id]/recalculate/route.ts
```

What they do:

- List opportunities.
- Create manual opportunities.
- Run discovery.
- Read opportunity details.
- Apply decisions.
- Merge canonical/duplicate opportunities.
- Recalculate scoring.
- Return structured API envelopes.
- Use Zod validation.
- Require admin/session access, except automation endpoints may use `CRON_SECRET`.

### Discovery Pipeline

File:

```text
lib/authority/opportunities.ts
```

Current candidate sources:

- configured compliance topic seeds
- existing indexed SEO pages
- source-monitor status
- provider configuration state

Current behavior:

- normalizes queries
- detects exact duplicates
- performs deterministic semantic duplicate checks
- classifies framework/cluster/intent/buyer stage from available source data
- checks existing content relationships
- calculates auditable component scores
- upserts records instead of creating exact duplicates
- records discovery-run history
- preserves provenance
- continues when providers are missing or one provider fails

### Editorial Module

Files:

```text
app/admin/authority/editorial/page.tsx
app/admin/authority/editorial/[id]/page.tsx
app/api/authority/editorial/route.ts
app/api/authority/editorial/[id]/route.ts
lib/authority/editorial.ts
```

What it does:

- Lists editorial items.
- Opens editorial detail pages.
- Allows draft generation.
- Allows workflow/status transitions.
- Stores reviews and audit logs.
- Does not publish content automatically.

Build/Expand opportunity decisions create linked editorial records and briefs.

### Knowledge Module

Files:

```text
app/admin/authority/knowledge/page.tsx
app/admin/authority/knowledge/[id]/page.tsx
app/api/authority/knowledge/route.ts
app/api/authority/knowledge/[id]/route.ts
lib/authority/knowledge.ts
```

What it does:

- Lists knowledge sources.
- Opens knowledge source detail pages.
- Supports verification/rejection.
- Supports source checking when `SEO_SOURCE_FETCH_ENABLED=true`.
- Stores versions, hashes and reviews.

Research opportunity decisions create linked knowledge research tasks.

### Observatory Module

Files:

```text
app/admin/authority/observatory/page.tsx
app/admin/authority/observatory/runs/page.tsx
app/admin/authority/observatory/runs/[id]/page.tsx
app/admin/authority/observatory/citations/page.tsx
app/admin/authority/observatory/competitors/page.tsx
app/admin/authority/observatory/history/page.tsx
app/admin/authority/observatory/failures/page.tsx
lib/authority/monitoring.ts
lib/authority/providers.ts
lib/authority/citation-parser.ts
lib/authority/analytics.ts
lib/authority/store.ts
```

What it does:

- Runs LLM monitoring.
- Uses existing OpenAI, Anthropic and Perplexity env var names.
- Parses citations.
- Detects Kodex mentions.
- Detects competitor mentions.
- Stores provider responses and monitoring runs.
- Displays Observatory run/citation/competitor/history/failure routes.

## Database Migrations Added

```text
supabase/migrations/011_authority_engine.sql
supabase/migrations/012_authority_operational_modules.sql
supabase/migrations/013_opportunity_intelligence_completion.sql
```

These add:

- monitoring projects
- prompts
- providers
- monitoring runs
- provider responses
- brand mentions
- citations
- citation URLs
- competitors
- visibility scores
- scheduled jobs
- job failures
- audit logs
- opportunities
- opportunity sources
- discovery runs
- discovery run items
- keyword metrics
- opportunity decisions
- opportunity duplicates
- editorial items
- editorial briefs
- editorial revisions
- editorial reviews
- editorial sources
- editorial assignments
- knowledge sources
- knowledge versions
- knowledge obligations
- knowledge links
- knowledge reviews
- notifications
- idempotency keys

RLS is enabled on the new Authority tables.

## Render Jobs Added

File:

```text
render.yaml
```

Configured jobs:

- daily opportunity discovery
- weekly discovery refresh
- daily LLM monitoring
- weekly visibility recalculation
- hourly retry
- source verification

No secret values are committed.

## Environment Variables Reused

No duplicate credential names were added.

Existing names used:

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

## CI and Tests

File:

```text
.github/workflows/ci.yml
```

CI runs on PRs into `staging`:

```text
npm run lint
npm test
npm run typecheck
npm run build
```

Local and GitHub Actions checks passed on both PR #2 and PR #3.

## Why You May Not See It In GitHub

Most likely reason:

You are viewing `main` or `staging`.

The work is currently on:

```text
feature/seo-opportunity-intelligence
```

GitHub will not show branch-only files on `main` or `staging` until the PR is merged.

To inspect it:

1. Open the repository.
2. Click the branch dropdown.
3. Select `feature/seo-opportunity-intelligence`.
4. Open the files listed in this document.

Or open PR #3:

```text
https://github.com/Jeyday23/kodex-leads/pull/3/files
```

## What Still Requires Manual Setup

Before it works in deployed production:

1. Merge PR #2 or PR #3 into `staging`.
2. Apply Supabase migrations in order:

```text
011_authority_engine.sql
012_authority_operational_modules.sql
013_opportunity_intelligence_completion.sql
```

3. Confirm Render has the existing env vars attached to the web, worker and cron services.
4. Deploy `staging` on Render.
5. Sign in with an admin Supabase profile.
6. Open:

```text
/admin/authority/opportunities
```

7. Click Run discovery.

## Known Limitations

- The screenshot is approximated in code. It is not a pixel-perfect Figma extraction.
- Discovery currently uses deterministic internal signals and existing SEO data. Deeper LLM-generated query expansion can be extended.
- Numeric search demand is intentionally not invented. Modeled or unknown demand appears as labels.
- Canonical Merge works through API, but a richer UI selector for canonical target should be added next.
- Source verification only fetches public official URLs when `SEO_SOURCE_FETCH_ENABLED=true`.

## Rollback

If deployment fails:

1. Revert the PR deployment in Render.
2. Restore the Supabase backup taken before migrations 011-013.
3. Disable the new Authority cron jobs in Render.
4. Re-deploy the previous known-good `staging` commit.

## No Sites Configuration

No ChatGPT Sites binding is included.

The repo does not include:

```text
.openai/hosting.json
```

The application continues to use GitHub, Render and Supabase.
