# Cloudflare deployment architecture

## Product decision

Use a Cloudflare Worker as the public edge gateway and keep the Next.js origin on Render for now.

This repository is not ready for a full Workers-only deployment because two production paths depend on capabilities that do not persist or execute in the Workers runtime:

- `lib/seo/agent-reach.ts` expects a local Python virtual environment and executable.
- `lib/seo/local-store.ts` writes fallback data to the local filesystem.

Cloudflare Pages is not the target. Cloudflare recommends Workers for new static and full-stack deployments, and this application has server-rendered pages plus API routes.

## What the Worker does

- Proxies browser and API traffic to the existing Render origin.
- Adds baseline transport and browser security headers.
- Prevents edge caching and indexing of `/admin`, `/auth`, and `/api` routes.
- Exposes `/__edge/health`, which verifies the Render `/api/health` endpoint.
- Runs an origin health check every 15 minutes and records structured logs in Workers Observability.

The Worker does not store application data and does not need D1, KV, or R2 bindings.

## Local validation

```bash
npm ci
npm run cf:types
npm run cf:check
npm run cf:dev
```

Open `http://localhost:8787/__edge/health` while the development server is running.

## Account authorization

Authenticate Wrangler before the first persistent deployment:

```bash
npx wrangler login
npx wrangler whoami
```

For CI, use a scoped Cloudflare API token supplied by the deployment platform. Do not commit the token or place it in `wrangler.jsonc`.

The repository includes a manual `Deploy Cloudflare Worker` GitHub Actions workflow. Add these repository or environment secrets before running it:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Create the token from Cloudflare's **Edit Cloudflare Workers** template and scope it to the intended account. Keep production secrets in a protected GitHub `production` environment.

## Deployment

Each Wrangler environment has its own origin. They must never be the same value.

| Wrangler env | Worker name | `ORIGIN_BASE_URL` |
| --- | --- | --- |
| `staging` | `kodex-leads-edge-staging` | `https://kodex-leads-it6d.onrender.com` |
| `production` | `kodex-leads-edge` | `https://REPLACE-WITH-PRODUCTION-ORIGIN.onrender.com` (placeholder) |

The production origin is a placeholder because the `kodex-leads-production` Render
service has not been provisioned yet. Replace it — in both `env.production.vars`
and the top-level `vars` fallback in `wrangler.jsonc` — with the real production
Render hostname before deploying production. Do not substitute the staging origin:
the placeholder fails loudly, a wrong origin serves staging data to the public.

Deploy staging first:

```bash
npm run cf:deploy:staging
```

After verifying the staging `workers.dev` URL and `/__edge/health`, deploy production:

```bash
npm run cf:deploy:production
```

Only after production verification should a custom hostname be routed to the Worker. Keep the Render hostname available as the origin and rollback path.

Render-side environment configuration — which env var group holds which key, and
which values the operator must supply per environment — is in
[ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md).

## Future full migration

A Workers-only migration becomes viable after:

1. Agent Reach is moved behind an external service/API or removed from runtime requests.
2. All filesystem fallback writes are replaced with Supabase or another durable store.
3. The current vinext compatibility and production build checks pass without forced dependency resolution.
4. Cron workloads are split into Cloudflare Queues or Workflows where execution can be retried safely.
