# Kodex Search & LLM Authority Engine: Implementation Specification

## Integration strategy

Implement this capability inside the existing `kodex-leads` staging application. Reuse the current Next.js, Supabase and LLM provider infrastructure. The Authority Engine should appear under the existing admin experience and share authentication, layout, deployment and operational conventions.

Recommended route group:

```text
/admin/authority
/admin/authority/prompts
/admin/authority/runs
/admin/authority/runs/[id]
/admin/authority/citations
/admin/authority/competitors
/admin/authority/failures
/admin/authority/settings
```

Recommended API routes:

```text
/api/authority/prompts
/api/authority/runs
/api/authority/runs/[id]
/api/authority/execute
/api/authority/cron
/api/authority/health
```

The existing `/api/seo/llm-sync` route must remain operational. Shared provider code may be refactored, but current behavior must not regress.

## Provider contract

Create or adapt a server-only interface:

```ts
export type MonitoringCitation = {
  title?: string;
  url: string;
  domain?: string;
  position?: number;
};

export type MonitoringRequest = {
  prompt: string;
  country?: string;
  language?: string;
  maxTokens?: number;
};

export type MonitoringResponse = {
  provider: "openai" | "anthropic" | "perplexity";
  model: string;
  answer: string;
  citations: MonitoringCitation[];
  rawResponse?: unknown;
  latencyMs: number;
  estimatedCost?: number;
};

export interface MonitoringProvider {
  isConfigured(): boolean;
  execute(input: MonitoringRequest): Promise<MonitoringResponse>;
}
```

Provider failures must be isolated. One provider failure must not discard successful results from other providers.

## Database migration

Use UUID primary keys, UTC timestamps and row-level security consistent with the current project. Adapt naming only when existing schema conventions require it.

```sql
create table if not exists authority_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand_name text not null default 'Kodex Compliance',
  brand_aliases text[] not null default array['Kodex', 'Kodex Compliance'],
  brand_domains text[] not null default array['kodex-compliance.com'],
  default_country text not null default 'DE',
  default_language text not null default 'en',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists authority_prompt_groups (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references authority_projects(id) on delete cascade,
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists authority_prompts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references authority_projects(id) on delete cascade,
  group_id uuid references authority_prompt_groups(id) on delete set null,
  prompt_text text not null,
  topic text,
  framework text,
  intent text,
  country text not null default 'DE',
  language text not null default 'en',
  active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists authority_competitors (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references authority_projects(id) on delete cascade,
  name text not null,
  aliases text[] not null default '{}',
  domains text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists authority_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references authority_projects(id) on delete cascade,
  prompt_id uuid references authority_prompts(id) on delete set null,
  prompt_snapshot text not null,
  country text,
  language text,
  trigger_type text not null check (trigger_type in ('manual','scheduled','retry')),
  idempotency_key text unique,
  status text not null check (status in ('queued','running','completed','partial','failed')),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists authority_provider_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references authority_runs(id) on delete cascade,
  provider text not null,
  model text,
  status text not null check (status in ('generated','skipped','failed')),
  answer_text text,
  raw_response jsonb,
  latency_ms integer,
  estimated_cost numeric(12,6),
  error_code text,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists authority_mentions (
  id uuid primary key default gen_random_uuid(),
  provider_result_id uuid not null references authority_provider_results(id) on delete cascade,
  entity_type text not null check (entity_type in ('brand','competitor')),
  entity_name text not null,
  matched_text text,
  mention_position integer,
  linked boolean not null default false,
  recommendation_strength numeric(5,4),
  extraction_confidence numeric(5,4),
  sentiment text,
  created_at timestamptz not null default now()
);

create table if not exists authority_citations (
  id uuid primary key default gen_random_uuid(),
  provider_result_id uuid not null references authority_provider_results(id) on delete cascade,
  title text,
  url text not null,
  domain text,
  citation_position integer,
  is_brand_domain boolean not null default false,
  valid_url boolean,
  http_status integer,
  checked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists authority_job_failures (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references authority_runs(id) on delete cascade,
  provider text,
  attempt integer not null default 1,
  retryable boolean not null default false,
  error_code text,
  error_message text not null,
  next_retry_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists authority_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);

create index if not exists authority_runs_prompt_created_idx
  on authority_runs(prompt_id, created_at desc);
create index if not exists authority_results_run_provider_idx
  on authority_provider_results(run_id, provider);
create index if not exists authority_citations_domain_idx
  on authority_citations(domain);
create index if not exists authority_mentions_entity_idx
  on authority_mentions(entity_type, entity_name);
```

Add RLS policies that restrict all Authority Engine tables to authenticated admin users according to the repository's current role model. Service-role access is server-only.

## Seed data

Seed one project, logical prompt groups and the following active prompts:

- What are the best EU AI Act compliance software platforms for European SaaS companies?
- Which tools help companies comply with EU AI Act Article 50 transparency obligations?
- What are the best EU-native alternatives to Vanta for compliance automation?
- How can a German SaaS company verify that its compliance controls are actually implemented?
- Which platforms cover GDPR, NIS2 and the EU AI Act together?
- What software helps verify AI transparency disclosures in production?
- What is the overlap between GDPR and EU AI Act compliance requirements?
- How should European companies collect evidence for NIS2 compliance?
- Which compliance automation tools are designed specifically for German and EU companies?

Seed initial competitors only where the current repository already identifies them or where explicitly configured through the UI. Do not hard-code unsupported claims about competitors.

## Scoring

Calculate metrics from stored results, not from UI-only state.

Suggested definitions:

- mention rate = generated responses with a Kodex brand mention / generated responses
- citation rate = generated responses with a Kodex-domain citation / generated responses
- provider coverage = providers generating successfully / configured providers attempted
- prompt visibility score = weighted combination of mention, citation, citation position and recommendation strength
- overall visibility score = normalized average across active prompts and the selected time window

Store enough atomic evidence to recalculate scores later. Do not make aggregate scores the only persisted data.

## Execution model

- Manual execution: authenticated admin action.
- Scheduled execution: bearer authorization using the existing `CRON_SECRET` pattern.
- Create one `authority_runs` record per prompt execution, with child provider results.
- Use deterministic idempotency keys for scheduled windows.
- Retry provider-level failures only when retryable.
- Maximum three attempts per provider result.
- Use bounded exponential backoff.
- Keep raw provider responses server-side and redact any accidental secret-like values before persistence.

## Render deployment

Reuse the standing Render environment variables. Do not include secret values in `render.yaml`.

Where Render Blueprint configuration is present, add only non-secret service declarations or cron schedule wiring. Secret values must remain managed in the Render dashboard or existing secret groups.

Recommended cron request:

```text
GET /api/authority/cron
Authorization: Bearer $CRON_SECRET
```

The cron endpoint must fail closed with `503` when `CRON_SECRET` is missing and `401` when authorization is invalid.

## Security requirements

- All provider modules and service-role Supabase clients must import `server-only`.
- Never log authorization headers, API keys or complete environment objects.
- Never serialize raw provider responses to the browser.
- Apply Zod validation to all write endpoints.
- Add request limits for manual runs.
- Sanitize and normalize citation URLs.
- Maintain an audit record for prompt, competitor and settings mutations.
- Do not allow the browser to choose arbitrary provider endpoints.

## Required documentation

Update the repository README with:

- Authority Engine route map
- standing environment-variable names, without values
- local execution instructions
- scheduled execution instructions
- migration procedure
- rollback procedure
- known provider limitations
