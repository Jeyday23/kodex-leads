# Environment setup: what the operator must fill in

`render.yaml` defines two complete, parallel stacks. `wrangler.jsonc` puts a
separate Cloudflare Worker in front of each one.

| | Staging | Production |
|---|---|---|
| Git branch | `staging` | `main` |
| Render web service | `kodex-leads-staging` | `kodex-leads-production` |
| Render workers | `kodex-authority-{monitoring,autopilot}-worker-staging` | `kodex-authority-{monitoring,autopilot}-worker-production` |
| Render cron jobs | 14, all suffixed `-staging` | 14, all suffixed `-production` |
| Env var groups | `kodex-leads-staging-*` | `kodex-leads-production-*` |
| Cloudflare Worker | `kodex-leads-edge-staging` | `kodex-leads-edge` |
| Render origin | `https://kodex-leads-it6d.onrender.com` | **not provisioned yet** |

Nothing is shared between the two columns. A staging credential is never
readable by a production service and vice versa.

## Placeholders that need a human value

| Where | Placeholder | How to resolve |
|---|---|---|
| `wrangler.jsonc` → `env.production.vars.ORIGIN_BASE_URL` | `https://REPLACE-WITH-PRODUCTION-ORIGIN.onrender.com` | Deploy the `kodex-leads-production` blueprint, copy its URL from the Render dashboard. |
| `wrangler.jsonc` → top-level `vars.ORIGIN_BASE_URL` | `https://REPLACE-WITH-PRODUCTION-ORIGIN.onrender.com` | Same value. This is the fallback for a bare `wrangler deploy`; it deliberately does **not** point at staging. |

Do not point production at the staging origin, even temporarily. The placeholder
fails loudly (502 from `/__edge/health`); a wrong origin fails silently by
serving staging data to the public.

## Render dashboard: env var groups to populate

Create the values in **Env Groups**, not on individual services. Every key below
is declared `sync: false` in `render.yaml`, so Render creates the group with an
empty slot and the blueprint never carries a secret in git.

Fill each group twice — once for `kodex-leads-staging-…`, once for
`kodex-leads-production-…` — with **different** values.

### `kodex-leads-<env>-core`
| Key | Notes |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Public URL of that environment. Read at build time. |
| `NEXT_PUBLIC_SUPABASE_URL` | **Separate Supabase project per environment.** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From that environment's Supabase project. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only. Never expose to the browser. |
| `SLACK_WEBHOOK_URL` | Use different channels so staging noise is distinguishable. |

### `kodex-leads-<env>-automation-secrets`
| Key | Notes |
|---|---|
| `CRON_SECRET` | **Generate independently per environment** (`openssl rand -hex 32`). Never copy staging's value into production. |
| `AUTOPILOT_CONTROL_SECRET` | Same: distinct value per environment. |

### `kodex-leads-<env>-integrations`
`OPENAI_API_KEY`, `OPENAI_MODEL`, `ANTHROPIC_API_KEY`, `CLAUDE_MODEL`,
`PERPLEXITY_API_KEY`, `PERPLEXITY_MODEL`, `GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL`,
`GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY`, `GOOGLE_SEARCH_CONSOLE_SITE_URL`,
`HUNTER_API_KEY`, `APOLLO_API_KEY`, `NORTHDATA_API_KEY`,
`LEAD_ENRICHMENT_MAX_PER_RUN`, `LEAD_PACKAGE_MAX_PER_RUN`,
`HUBSPOT_PRIVATE_APP_TOKEN`.

Use separate API keys or projects per environment where the vendor allows it, so
staging spend and rate limits cannot exhaust production quota. The two
`LEAD_*_MAX_PER_RUN` limits are cost controls — set them low in production until
a supervised run has been reviewed.

### `kodex-leads-<env>-founder-ops`
`AIRTABLE_ACCESS_TOKEN`, `AIRTABLE_BASE_ID`, `AIRTABLE_DEALS_TABLE_ID`,
`AIRTABLE_TASKS_TABLE_ID`, `FOUNDER_OPS_GITHUB_REPOSITORY`, `GITHUB_TOKEN`.

Attached to the web service only. Point staging at a scratch Airtable base.

## Database

There is no `databases:` block in `render.yaml` and none is needed: persistence
is Supabase, and nothing in this repo connects to a Render-managed Postgres.
Per-environment data isolation comes from **provisioning a separate Supabase
project for each environment** and putting its URL and keys in that
environment's `-core` group. Apply the migrations in `supabase/migrations/` to
the production project before the first production deploy.

## Autonomy is OFF in production by default

`render.yaml` pins these as literal values on the production stack, so a
dashboard edit alone will not start automation:

| Key | Staging | Production |
|---|---|---|
| `AUTOPILOT_SCHEDULE_ENABLED` | dashboard-controlled (`sync: false`) | `false` |
| `SEO_SOURCE_FETCH_ENABLED` | dashboard-controlled (`sync: false`) | `false` |
| `LEAD_AUTOMATION_ENABLED` | `true` on the lead cron | `false` |
| `MEDIA_PROVIDER` | `queue-only` | `queue-only` |

Production cron jobs and workers still deploy and stay on schedule, but each run
exits early via its autonomy gate and records a skip. To enable production
autonomy later, change the literal in `render.yaml` in a reviewed commit — and
only after a manual production run has produced output someone has read.
`MEDIA_PROVIDER` must stay `queue-only` until Kodex-owned generation credentials
are in place; anything else spends generation credits.

## Cloudflare dashboard / CLI

Only `ORIGIN_BASE_URL` is configured, and it lives in `wrangler.jsonc` (it is not
a secret). CI needs two repository secrets, already documented in
`docs/CLOUDFLARE_DEPLOYMENT.md`: `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID`. Keep the production token in a protected GitHub
`production` environment.

## Order of operations for the first production bring-up

1. Create the production Supabase project and apply `supabase/migrations/`.
2. Sync the blueprint in Render; it creates the `-production` services and the
   empty `kodex-leads-production-*` env groups.
3. Fill every production group. Generate a fresh `CRON_SECRET` and
   `AUTOPILOT_CONTROL_SECRET` — do not reuse staging's.
4. Let `kodex-leads-production` build from `main` and confirm `/api/health`.
5. Copy the production Render URL into both `ORIGIN_BASE_URL` placeholders in
   `wrangler.jsonc` and commit.
6. `npm run cf:deploy:production`, then check `/__edge/health`.
7. Route the custom hostname only after step 6 passes. Keep the Render hostname
   as the rollback path.
8. Leave autonomy off. Revisit the flag table above only after supervised runs.

## Note on service renames

Every service except the web service gained an environment suffix
(`kodex-authority-autopilot-worker` → `…-worker-staging`, and likewise for all
14 cron jobs). Render keys services by name, so the next blueprint sync creates
the suffixed services and marks the old unsuffixed ones for deletion. Confirm
the plan in Render's sync preview before applying, and expect one gap in the
staging cron schedule across the cutover.
