# Codex Execution Task: Autonomous Kodex Ranking Engine

## Execute this task

Do not only summarize, plan, or create mock screens. Implement the system in this repository and leave it in a deployable state.

Repository:

`Jeyday23/kodex-leads`

Work branch:

`feature/autonomous-ranking-engine`

Base state:

`main`

Deployment architecture:

- GitHub for source control
- Render for the web service, workers, cron jobs and deployment
- Supabase for authentication, PostgreSQL, persistence, RLS and audit history
- Existing OpenAI, Anthropic and Perplexity integrations
- No ChatGPT Sites project
- No `.openai/hosting.json`

The existing Authority Engine already includes Command, Opportunities, Editorial, Knowledge and Observatory modules. Extend those modules into a closed-loop autonomous authority and ranking system.

## Business outcome

The system must autonomously perform the operational work most likely to improve Kodex visibility in Google and answer engines:

1. Discover commercially valuable compliance questions.
2. Research those questions using authoritative legal sources.
3. Generate or improve public content.
4. Validate every factual and legal claim.
5. Publish low-risk approved content changes through the existing public content system.
6. Update technical SEO signals and internal links.
7. Monitor search performance and LLM mentions/citations.
8. Diagnose underperformance.
9. Revise weak pages automatically.
10. Preserve complete provenance, approvals, versions and rollback capability.

The system cannot guarantee rankings. It must optimize for measurable improvement without spam, fabricated authority, fake engagement or unsupported legal claims.

## Existing implementation to preserve and reuse

Inspect the repository before editing. Reuse current Authority Engine, SEO and public-content modules rather than creating a parallel application.

Relevant existing areas include:

- `app/admin/authority/**`
- `app/api/authority/**`
- `lib/authority/**`
- `lib/seo/**`
- `app/learn/[framework]/[slug]`
- `app/compare/[slug]`
- `app/deadlines/[framework]`
- `app/enforcement/[framework]/[slug]`
- `app/api/seo/cron`
- `app/api/seo/llm-sync`
- `supabase/migrations/011_authority_engine.sql`
- `supabase/migrations/012_authority_operational_modules.sql`
- `supabase/migrations/013_opportunity_intelligence_completion.sql`
- `render.yaml`

Do not break existing lead capture, authentication, Supabase, SEO, Stripe, Slack, HubSpot, PostHog or Authority Engine functionality.

## Standing environment variables

Reuse existing names and values from Render. Never commit real values.

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `ANTHROPIC_API_KEY`
- `CLAUDE_MODEL`
- `PERPLEXITY_API_KEY`
- `PERPLEXITY_MODEL`
- `GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL`
- `GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY`
- `SEO_SOURCE_FETCH_ENABLED`
- `SLACK_WEBHOOK_URL`
- `HUBSPOT_PRIVATE_APP_TOKEN`

Add new environment variables only when they represent a genuinely new integration. Document each new variable. Never create duplicate names for standing credentials.

## Core operating loop

Implement this as one auditable workflow:

`discover -> research -> brief -> draft -> validate -> approve -> publish -> verify -> monitor -> diagnose -> revise`

Every stage must create durable Supabase records. A page may not skip required gates.

## 1. Autonomous opportunity selection

Extend Opportunity Intelligence so the scheduler selects work automatically.

Inputs:

- existing opportunity records
- existing public content inventory
- Google Search Console metrics when configured
- internal site-search or lead query signals when available
- LLM monitoring losses
- competitor citation gaps
- regulatory-source changes
- content freshness
- conversion performance

The selector must prioritize:

- commercial intent
- Kodex product relevance
- regulatory urgency
- measured or clearly labeled demand
- LLM citation gap
- competitor weakness
- conversion potential
- source availability
- content feasibility
- current topic-cluster coverage

Do not invent search volume. Preserve `measured`, `modeled`, `manual` or `unknown` provenance.

Implement daily limits to prevent scaled low-value publishing. Defaults:

- maximum 3 new public pages per day
- maximum 10 material revisions per day
- configurable by environment or database policy

## 2. Authoritative research agent

For each selected opportunity:

1. Search the verified Knowledge database first.
2. Fetch only approved public official sources when live source fetching is enabled.
3. Prefer EU and national primary sources.
4. Record URL, title, issuing body, jurisdiction, publication date, effective date, retrieved date and content hash.
5. Preserve source versions instead of overwriting them.
6. Extract obligations, exceptions, applicability, deadlines and penalties with exact source support.
7. Mark uncertainty and conflicting interpretations.
8. Stop the workflow when material claims cannot be supported.

The agent must not treat an LLM response as an authoritative legal source.

## 3. Claim ledger

Create a claim-level verification system.

Every generated factual, legal, product or comparative claim must have a ledger record containing:

- claim text
- claim category
- supporting source IDs
- supporting source excerpts or structured evidence
- jurisdiction
- effective date
- confidence
- verification result
- reviewer requirement
- last checked date
- content asset and version

Claim categories:

- legal obligation
- deadline
- penalty
- applicability
- regulator guidance
- product capability
- competitor comparison
- quantitative statement
- general explanation

Hard failures:

- unsupported deadline
- unsupported penalty
- unsupported product capability
- fabricated statistic
- invented customer result
- comparison without verifiable basis

## 4. Editorial generation

Extend Editorial so it autonomously creates briefs, outlines, drafts and revisions.

Each brief must include:

- target query
- supporting queries
- intent
- audience
- jurisdiction
- framework
- recommended content type
- direct-answer block
- outline
- source plan
- claim plan
- internal-link plan
- conversion objective
- Kodex capability mapping
- FAQ plan
- metadata plan
- structured-data recommendation
- success metrics

Content types:

- authoritative guide
- implementation checklist
- deadline page
- enforcement explainer
- comparison page
- glossary or definition
- evidence template
- decision tool
- FAQ
- product-led solution page

Generated drafts must be useful without requiring the reader to buy Kodex. Product positioning should be relevant and accurate, not inserted mechanically.

## 5. Quality and policy gates

Create deterministic and model-assisted gates. A content asset cannot publish unless all required gates pass.

Required gates:

- authoritative-source coverage
- claim-ledger verification
- legal-date consistency
- duplicate-content detection
- keyword-cannibalization detection
- semantic similarity threshold
- original-value assessment
- intent match
- readability and clarity
- Kodex capability accuracy
- competitor-claim support
- title/H1 alignment
- canonical integrity
- internal-link validity
- external-link validity
- robots and indexability
- structured-data validity
- sitemap eligibility
- brand and tone policy
- prohibited-content check

The system must reject thin pages, doorway pages, mass templated pages and content whose primary value is search manipulation.

## 6. Risk-based approval policy

Implement configurable publication policies.

### Auto-publish eligible

Low-risk changes may publish automatically after all gates pass:

- typo and grammar fixes
- broken-link repair
- metadata improvements that do not change legal meaning
- internal-link additions
- sitemap updates
- non-material clarity improvements
- additions supported entirely by already verified Knowledge records
- freshness timestamps backed by a successful source check

### Human approval required

Require an authenticated admin approval for:

- new legal interpretation
- penalty or deadline language
- product capability claims
- competitor comparisons
- new public pages before the system has completed a controlled pilot
- major changes to a page already generating material traffic or conversions
- redirects or deletions
- changes with conflicting sources

### Never allowed

- fake backlinks
- fake testimonials or reviews
- spam outreach
- cloaking
- hidden text
- doorway pages
- fabricated citations
- fake authors or credentials
- invented search demand
- publishing unsupported legal advice

Create a database policy table so approval rules can be changed without code deployment.

## 7. Public-content publishing adapter

Build a versioned publishing service for the existing public content system.

The adapter must support:

- create draft content asset
- create immutable content version
- preview rendered output
- publish approved version
- update an existing page
- schedule publication
- unpublish
- rollback to a previous version
- record deployment result

Use the existing Supabase-backed SEO content model and existing dynamic public routes wherever possible.

Do not fake publication by changing only an admin status. A successful publication must result in a public page that returns HTTP 200 from `NEXT_PUBLIC_SITE_URL`.

If the current repository cannot publish a specific asset type, implement a clearly defined adapter interface and the missing repository-backed adapter. Do not silently claim success.

## 8. Technical SEO automation

After publication, automatically verify and manage:

- HTTP status
- canonical URL
- title and description
- H1
- crawlable server-rendered body content
- no accidental `noindex`
- robots access
- sitemap inclusion
- internal links from relevant cluster pages
- structured data when eligible
- Open Graph metadata
- hreflang only when valid multilingual equivalents exist
- stable URL and redirect behavior
- duplicate canonical conflicts
- mobile-safe rendering

Maintain:

- `sitemap.xml`
- `robots.txt`
- `llms.txt`
- AI sitemap or public content inventory already present in the repository

Do not add structured data that is unsupported by visible page content.

## 9. Search Console integration

Implement server-only Search Console ingestion using the existing service-account variables when configured.

Store daily page/query metrics:

- impressions
- clicks
- click-through rate
- average position
- country
- device
- date
- page
- query

Use the data for opportunity discovery and revision decisions.

When Search Console is not configured:

- mark the integration unavailable
- continue other workflows
- never create fake metrics

Do not use an indexing API for ordinary content unless the API officially supports that content type. Rely on crawlability, sitemaps and normal discovery.

## 10. LLM and answer-engine optimization

Extend Observatory so each public content asset has a linked monitoring prompt set.

Monitor across configured providers:

- Kodex mention
- Kodex direct citation
- cited Kodex URL
- citation position
- competitor mentions
- competitor citations
- answer wording
- model
- country
- language
- search mode
- timestamp

Generate diagnosis records when Kodex loses:

- missing direct answer
- insufficient authority
- incomplete source support
- weak entity clarity
- stale content
- poor internal linking
- missing topic coverage
- competitor page more complete
- crawl or indexability problem

Do not treat provider output as deterministic ranking truth. Preserve snapshots and trends.

## 11. Automated revision engine

Create a revision planner that opens a new content version when performance falls below policy thresholds.

Triggers:

- page not indexed after configurable waiting period
- impressions rising but CTR materially below cluster baseline
- average position deteriorating
- LLM citation lost
- competitor citation growth
- official source changed
- deadline or applicability changed
- broken links
- conversion decline
- content freshness expiration

Revision actions may include:

- improve direct answer
- add missing source support
- update legal dates
- add implementation examples
- improve headings
- strengthen internal links
- merge cannibalizing pages
- update title/description
- add missing FAQs
- clarify Kodex entity and capability references

Every revision must run through the same claim and quality gates.

## 12. Topic-cluster and internal-link engine

Create a graph of frameworks, entities, questions and public pages.

The system must:

- identify orphan pages
- identify missing cluster hubs
- recommend or add contextual internal links
- avoid excessive exact-match anchors
- prevent circular low-value link patterns
- choose canonical cluster pages
- detect cannibalization
- preserve redirect history when merging pages

Initial clusters:

- EU AI Act
- Article 50 transparency
- GDPR and AI
- NIS2
- DORA
- CRA
- ISO 27001
- SOC 2
- AI governance evidence
- compliance implementation verification

## 13. Conversion connection

Ranking without business impact is insufficient.

Link each content asset to:

- target CTA
- lead source
- assessment flow
- conversion event
- assisted conversion
- CRM routing when configured

Store page-level conversion metrics. Do not optimize purely for traffic when a lower-volume page drives stronger qualified demand.

## 14. Authority and outreach queue

The engine may identify external authority opportunities, but must not fabricate or spam them.

Create an outreach queue for:

- university partnerships
- legal expert contributions
- regulator or official event references
- podcasts and webinars
- industry directories
- original research distribution
- partner resource pages
- customer-approved case studies

The system may draft outreach. Sending requires explicit configuration and approval.

## 15. Required database migration

Add a new ordered migration after 013. Do not rewrite already-applied migrations.

Minimum new tables:

- `authority_content_assets`
- `authority_content_versions`
- `authority_content_claims`
- `authority_claim_sources`
- `authority_quality_gate_runs`
- `authority_quality_gate_results`
- `authority_approval_policies`
- `authority_approval_requests`
- `authority_publication_jobs`
- `authority_publication_events`
- `authority_page_audits`
- `authority_internal_links`
- `authority_search_metrics`
- `authority_llm_asset_metrics`
- `authority_revision_plans`
- `authority_revision_events`
- `authority_content_experiments`
- `authority_outreach_opportunities`
- `authority_conversion_metrics`

Requirements:

- foreign keys
- useful indexes
- uniqueness constraints
- idempotency keys
- immutable version history
- RLS
- service-role worker access
- authenticated admin access
- timestamps
- actor and audit fields

## 16. Required admin routes

Add or complete:

- `/admin/authority/command`
- `/admin/authority/opportunities`
- `/admin/authority/editorial`
- `/admin/authority/editorial/[id]`
- `/admin/authority/content`
- `/admin/authority/content/[id]`
- `/admin/authority/knowledge`
- `/admin/authority/observatory`
- `/admin/authority/publications`
- `/admin/authority/revisions`
- `/admin/authority/technical-seo`
- `/admin/authority/outreach`
- `/admin/authority/settings/automation`
- `/admin/authority/settings/publishing-policy`

The Command page must show the complete pipeline and blocked items.

## 17. Required APIs

Implement protected APIs using the repository’s structured response pattern.

Minimum endpoints:

- `POST /api/authority/autopilot/run`
- `GET /api/authority/autopilot/status`
- `GET /api/authority/content`
- `POST /api/authority/content`
- `GET /api/authority/content/[id]`
- `PATCH /api/authority/content/[id]`
- `POST /api/authority/content/[id]/generate`
- `POST /api/authority/content/[id]/validate`
- `POST /api/authority/content/[id]/approve`
- `POST /api/authority/content/[id]/publish`
- `POST /api/authority/content/[id]/rollback`
- `POST /api/authority/content/[id]/audit`
- `POST /api/authority/content/[id]/revise`
- `GET /api/authority/publications`
- `GET /api/authority/search-console/status`
- `POST /api/authority/search-console/sync`
- `GET /api/authority/technical-seo/issues`
- `POST /api/authority/technical-seo/repair`

Admin actions require authenticated admin sessions. Render automation may use `CRON_SECRET` or service-role worker execution. GET endpoints containing internal data must not be public.

## 18. Background services and schedules

Update `render.yaml` without putting values in it.

Add or complete:

- daily autonomous planning job
- research worker
- content generation worker
- quality-gate worker
- publication worker
- daily technical audit
- daily Search Console sync
- daily LLM monitoring
- revision planner
- hourly retry worker
- source-change verifier

Recommended default schedule:

- 04:00 daily metrics sync
- 05:00 discovery and planning
- 06:00 research and draft generation
- 07:00 quality gates
- 08:00 eligible publication queue
- 09:00 post-publication audit
- 10:00 LLM monitoring
- hourly retries
- weekly cluster and cannibalization analysis

All jobs must be idempotent, rate-limited and safe to rerun.

## 19. Autopilot states

Implement these global modes:

- `off`: monitoring only
- `draft_only`: discover, research and draft
- `guarded`: auto-publish only low-risk eligible changes
- `controlled`: publish new pages only after approval, but automate revisions and technical fixes by policy

Default production mode must be `draft_only` until an admin explicitly changes it.

Store mode changes in audit logs.

## 20. Notifications

Create in-app and optional Slack notifications for:

- high-priority opportunity selected
- research blocked
- unsupported claim detected
- content ready for approval
- page published
- publication failed
- rollback executed
- page not indexable
- source changed
- LLM citation gained or lost
- material search decline
- competitor visibility increase
- automation budget or daily limit reached

Slack failure must not fail the underlying job.

## 21. Security

Requirements:

- all Authority pages require authenticated admin access
- all internal read and write APIs require authorization
- cron and worker secrets remain server-only
- service-role key remains server-only
- no raw secrets in UI, API responses or logs
- Zod validation on inputs
- safe error envelopes
- CSRF-safe mutations
- rate limiting for expensive actions
- URL allow-listing or SSRF protection for source fetching
- HTML sanitization for generated content
- audit logs for every approval, publication, rollback and mode change
- no arbitrary code execution from model output

## 22. Testing

Add unit, integration and end-to-end coverage.

Unit tests:

- risk classification
- approval-policy selection
- claim verification
- source coverage
- quality gates
- content similarity
- cannibalization detection
- internal-link selection
- revision triggers
- daily publication limits
- autopilot mode behavior

Integration tests:

- opportunity creates research task
- research creates source-backed brief
- brief creates draft and claims
- unsupported claim blocks publication
- verified low-risk change publishes in guarded mode
- high-risk page requires approval
- published page returns HTTP 200
- sitemap contains published URL
- rollback restores previous version
- Search Console unavailable state does not create fake data
- provider failure creates retryable job
- metrics create a revision plan

End-to-end tests:

- logged-out user cannot access Authority Engine
- admin can approve a blocked publication
- Run autopilot executes the real pipeline
- public page changes after successful publication
- publication failure is visible and retryable

Run:

- `npm run lint`
- `npm test`
- `npm run typecheck`
- `npm run build`

Ensure GitHub Actions runs on pull requests to both `main` and `staging`.

## 23. Production acceptance test

The implementation is not complete until this controlled scenario succeeds:

1. Create one Germany/EU compliance opportunity.
2. Select verified official sources.
3. Generate an editorial brief.
4. Generate a draft with a complete claim ledger.
5. Pass all quality gates.
6. Approve the item when policy requires it.
7. Publish it through the real public-content adapter.
8. Confirm the public URL returns HTTP 200.
9. Confirm canonical, robots, sitemap and internal links.
10. Store a publication event and immutable version.
11. Run Observatory prompts linked to the page.
12. Store search/LLM baseline metrics.
13. Create a test underperformance signal.
14. Generate a revision plan.
15. Publish the verified revision.
16. Roll back to the previous version successfully.

Do not claim completion if the publication step only changes a database status or uses mocked responses.

## 24. Deployment and migration

At completion provide exact steps for:

- applying the new Supabase migration
- backing up Supabase first
- attaching existing Render environment variables to each service
- creating or updating Render workers and cron jobs
- selecting an initial autopilot mode
- running the controlled production test
- enabling guarded automation
- disabling automation immediately
- rolling back code, database and content versions

## 25. Final delivery report

Provide:

- branch
- commit SHA
- pull request URL
- files added and changed
- migrations added
- routes and APIs added
- workers and schedules added
- environment variables reused or added
- tests and CI results
- actual production acceptance result
- known limitations
- manual deployment actions
- rollback instructions

## Definition of done

The task is complete only when the system can autonomously discover an opportunity, research it, create a source-backed draft, validate claims, publish an eligible approved change, verify the public page, monitor performance and create a revision from measured results.

A dashboard, prompt generator, mocked workflow or database-only publication status is not completion.
