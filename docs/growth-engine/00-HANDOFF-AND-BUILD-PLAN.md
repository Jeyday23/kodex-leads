# Kodex Growth Engine - Handoff and Build Plan

**Date:** 10 September 2026
**Owner:** Jeremiah Matador (CEO, Kodex Compliance)
**Architect / supervisor:** Claude (supervisor; workers build, supervisor verifies).
**Branch:** `growth-engine` (cut from `main` at `f4b52ed`). Nothing is pushed to GitHub until Jeremiah says so.
**Working clone:** `/Users/jeremiahmatador/kodex-growth` (durable; the earlier `/tmp` scratchpad clone was wiped by OS temp cleanup and all work in it was lost).

---

## 1. The assignment

Rebuild `Jeyday23/kodex-leads` into an in-house growth engine that does what two paid tools do, built better, so Kodex pays for neither.

| Tool reviewed | What it does |
|---|---|
| **Pancake** (app.getpancake.ai) | "Brain" knowledge graph (market profile, ICP, personas, keywords, message pillars, competitors, influencers, voice, signals); signal-based LinkedIn lead-gen + outreach sequences; AI SEO content planner with CMS publishing; Brain exposed to Claude/Codex/Cursor over MCP |
| **Okara** (okara.ai "AI CMO") | Editable context documents; real Lighthouse / Core Web Vitals / technical audits + a deterministic 10-point GEO citation-readiness checklist; 8 per-channel agents (SEO, GEO, Reddit, X, LinkedIn, Articles, X Influencer, UGC Video) each with its own brand-voice config; a tool-using "CMO" chat that gates actions on plan and asks for confirmation before mutating anything |

**"Better" means, concretely:**
1. Explainable scores everywhere (lead confidence shows its factor breakdown; audit scores show trends), never a bare opaque number.
2. Nothing publishes or sends without an approval step. No LinkedIn session automation (ToS/ban risk) and no automatic Reddit posting (community-ban risk); drafts and manual tasks instead.
3. Provider status is honest: when a credential is missing the UI says "not configured", it never invents data (this repo already enforces this for demand numbers; keep the standard).
4. The Brain is one context bundle reused by every generator, and exposed read-only over MCP.
5. Everything runs inside the existing Next.js + Supabase + Render stack with EU residency (Bedrock Frankfurt for Claude).

---

## 2. Where everything is

| Item | Location |
|---|---|
| Working clone (161 commits) | `/Users/jeremiahmatador/kodex-growth` |
| Working branch | `growth-engine` |
| Agent worktrees (one per workstream) | `/Users/jeremiahmatador/kodex-growth-ws/<name>` on branches `ws/<name>` |
| Baseline verification (before any Growth work) | `npm run typecheck` clean; `npm test` 139/139 pass; `npm run lint` clean; Node 24.14 / npm 11.11 |
| Jeremiah's own clone (NOT used by agents; dirty, different branch, has a broken ref) | `/Users/jeremiahmatador/kodex-leads` |
| Production | Render, `https://kodex-leads-it6d.onrender.com` (`/api/health`). Staging tracks `staging`, production tracks `main`. |
| Release rule (from Jeremiah) | Branch -> PR into `main` -> CI `verify` + `browser-smoke` must pass -> deploy to staging and test -> squash-merge. Never push directly to `main`. |

### What already exists in the repo (do not rebuild; extend)

| Capability | Where | Notes |
|---|---|---|
| Admin auth, RLS, service-role separation | `lib/authority/auth.ts`, `lib/supabase/*`, migrations 021-023 | `requireAuthorityPage()` for pages, `requireAuthorityApi(request, {allowCron})` for routes; returns `{ok:true, actor, role}` or `{ok:false, response}`. Fails closed. `auth.ts` is `"server-only"`. |
| Privileged DB client | `lib/seo/db.ts` -> `getSeoSupabase()` | Returns `null` when unconfigured; every store must fall back to seed data (see `lib/authority/store.ts` for the pattern). Deliberately NOT `"server-only"`. |
| API response helpers | `lib/authority/api.ts` -> `apiSuccess`, `apiError`, `paginationFromUrl` | Envelope `{success, data, error, metadata}`. |
| Claude via Bedrock (EU) | `lib/llm/bedrock.ts` (`getBedrockConfig`, `bedrockMessage`); multi-provider fan-out in `lib/seo/llm-providers.ts` | Growth modules use `lib/growth/llm.ts` instead (Job 0). |
| LLM answer-engine monitoring (GEO outcomes) | `lib/authority/monitoring.ts`, `providers.ts`, `citation-parser.ts`; tables `monitoring_*`, `brand_mentions`, `citations`, `competitors`, `visibility_scores` (migration 011) | The "AI visibility" measurement Pancake charges for. Already built. |
| Content lifecycle, quality gates, editorial approval, publication | `lib/authority/autonomous-ranking.ts`, `opportunities.ts` (`createOpportunity`), `editorial.ts`; migrations 012-014 | Site articles publish into the app's own routes. No external CMS needed. |
| Regulatory-trigger lead discovery + approval queue | `lib/seo/lead-discovery.ts`, `lead-work-packages.ts`, `eu-dpa-enforcement.ts`, `eu-tenders.ts`; migrations 015-019 (`public.discovered_leads` in 018); `app/admin/authority/outreach/ApprovalQueue.tsx` | Keep it; add more signal types alongside. |
| Search Console sync | `lib/seo/google-search-console.ts`, `scripts/run-authority-search-console-sync.ts` | |
| Email deliverability checks | `lib/seo/domain-deliverability.ts` | Reuse for outbound email sequences. |
| Workers / cron entrypoints | `workers/*.ts`, `scripts/run-*.ts`, `render.yaml` | Plain `tsx`; modules they import must not be `"server-only"` (enforced by `tests/server-module-boundaries.test.ts`). |
| Admin shell + styles | `app/admin/authority/layout.tsx` (nav array), classes `authority-module`, `authority-topbar`, `authority-panel`, `dashboard-grid`, `metric-tile`; `AuthorityActionButton` in `app/admin/authority/AuthorityActions.tsx` | |
| Tests | `tests/*.test.ts` with `node:test` + `node:assert/strict`; `npm test` runs `node --conditions=react-server --import tsx --test tests/*.test.ts` | |
| CI | `.github/workflows/ci.yml`: `npm audit --omit=dev --audit-level=high`, lint, test, typecheck, build, Playwright smoke | Any new dependency must pass the audit. |
| Already-installed deps of note | `zod` ^4, `recharts` ^3, `@anthropic-ai/bedrock-sdk`, `@supabase/supabase-js` | |

---

## 3. Target architecture

```
                 +------------------------- Brain (WS1) --------------------------+
                 | profile . ICP . personas . keywords . pillars . objections      |
                 | competitors . influencers . per-channel voices . signals cfg    |
                 +----------------+---------------------------+-------------------+
                                  | BrainContextBundle        | read-only tools
        +-------------------------+----------------+          |
        v                         v                v          v
  Signals + Leads (WS3)   Channel agents (WS4)  CMO chat (WS5)   MCP server (WS5)
  hiring . stack .        linkedin . x .        tool loop +      Claude / Codex /
  regulatory . manual     reddit . article      confirm cards    Cursor clients
  explainable score       brief . email
  sequences (gated)       planner + quality gate
        |                         |
        +------------+------------+
                     v
   Site audits (WS2): Lighthouse . CWV . technical . GEO checklist . trends
                     v
   Growth Command dashboard (WS6, after merge): scores, queues, "needs attention"
```

All new code lives under `lib/growth/**`, `app/api/growth/**`, `app/admin/authority/<module>/**`, `scripts/run-growth-*.ts`, `tests/growth-*.test.ts`, `supabase/migrations/024-028`.

---

## 4. Jobs

### Job 0 - Shared foundation (sequential, before the fan-out)

Two modules everyone else imports. Neither may be `"server-only"` (scripts import them). No new dependencies.

- **`lib/growth/llm.ts`**: `generateText()`, `generateJson()` and `getGrowthLlmStatus()`. Provider order: Bedrock (reuse `getBedrockConfig`/`bedrockMessage`), then direct Anthropic (`ANTHROPIC_API_KEY` + `CLAUDE_MODEL`), then OpenAI (`OPENAI_API_KEY` + `OPENAI_MODEL`). First configured provider wins; on failure fall through to the next. Result carries `status` (`generated` | `skipped` | `failed`), `text`, `provider`, `model`, `detail`. `generateJson` extracts the first JSON object/array from the text (tolerating code fences), validates with a zod schema, and returns either the typed value or a `failed` result. `getGrowthLlmStatus()` reports each provider's `configured` flag and missing env var names. No provider is ever called from anywhere else in `lib/growth/**`.
- **`lib/growth/context.ts`**: the `BrainContextBundle` type (company profile + ICP; personas; keywords typed product|problem|competitor with language; message pillars; objections; competitors with summary/domain; influencers; per-channel voices for linkedin|x|reddit|articles|email each with tone, rules, banned terms, max length, example; top-level signal configs). `seedBrainContextBundle` filled with real Kodex Compliance content drawn from this repo. `getBrainContextBundle()` returns the seed for now (WS1 swaps the body for a store read). `getChannelVoice(bundle, channel)`. `renderBrainContext(bundle, options)` renders a compact prompt section (optionally focused on one channel and a subset of sections).
- **Tests `tests/growth-foundation.test.ts`**: status honest with no env vars; `generateText` returns `skipped` with no providers; `generateJson` rejects malformed and schema-invalid JSON without throwing; `renderBrainContext` includes the requested channel's voice and excludes others; seed has at least one entry in every category; the rendered context contains no em dash (every voice bans it).

### WS1 - Brain (knowledge graph + per-channel voice)
Replaces Pancake Brain and Okara Context + agent voice settings.

- **Migration `024_growth_brain.sql`**: `growth_brain_profile` (singleton `id='global'`: company fields + `icp jsonb` + `sales_language_rules text[]`), `growth_personas`, `growth_keywords` (`type` check in product|problem|competitor, `language`), `growth_message_pillars`, `growth_objections`, `growth_influencers`, `growth_channel_voices` (`channel` check in linkedin|x|reddit|articles|email; unique per channel), `growth_signal_configs` (`type`, `enabled`, `targets jsonb`). Extend the existing `competitors` table (migration 011) with `summary text` and `domain text` via `alter table ... add column if not exists`; do not create a parallel competitors table. RLS + the service_role/admin policy loop copied from migration 014.
- **`lib/growth/brain/`**: `types.ts` (re-export from `lib/growth/context.ts`), `store.ts` (Supabase read/write with seed fallback), `seed-from-website.ts` (fetch homepage + up to 6 internal pages -> `generateJson()` with a zod schema -> proposed bundle; never auto-apply), `bundle.ts`. Then **replace the body of `getBrainContextBundle()` in `lib/growth/context.ts`** to call the store (keep the seed fallback; keep the file free of `"server-only"`).
- **API `app/api/growth/brain/`**: `bundle` (GET), `profile` (GET/PUT), `personas|keywords|pillars|objections|competitors|influencers|voices|signals` (GET list, POST create, PATCH/DELETE `[id]`), `seed` (POST -> proposal), `seed/apply` (POST -> writes; the confirmation step).
- **Admin UI `app/admin/authority/brain/`**: `page.tsx` server component + `BrainGraph.tsx` client component: hand-rolled SVG radial graph (company centre, 8 category nodes, item nodes), click -> right-hand detail panel with editable forms, "Seed from website" showing the proposal diff before apply. No new dependencies.
- **Tests `tests/growth-brain.test.ts`**: store falls back to seed without Supabase; writes without Supabase return not-configured and never throw; seed parser rejects malformed JSON; `listCompetitorNames()` still works; `getBrainContextBundle()` still equals the seed with no Supabase.

### WS2 - Site audits (technical SEO + GEO readiness)
Replaces Okara Analytics -> SEO / Technical / GEO tabs.

- **Migration `025_growth_site_audits.sql`**: `growth_site_audits` (`url`, `kind` check in lighthouse|technical|geo|site_files, `device` nullable mobile|desktop, `score numeric`, `payload jsonb`, `issues jsonb`, `measured_at`). Index on (`url`, `kind`, `measured_at desc`). RLS loop.
- **`lib/growth/audit/`**: `pagespeed.ts` (PageSpeed Insights API v5; `PAGESPEED_API_KEY` optional; both strategies; category scores + LCP/FCP/TBT/CLS with pass/fail against named CWV threshold constants), `technical.ts` (single fetch with timing: status, server header, encoding, page size, TTFB, cacheability, render-blocking `<script>`/`<link rel=stylesheet>` counts in `<head>`; pure parsers exported for tests), `geo-checklist.ts` (deterministic 10 signals: schema.org JSON-LD, meta description, heading structure, content depth >= 600 words, canonical, robots.txt, llms.txt, sitemap.xml, `<html lang>`, Flesch reading ease; each `pass|fix` with a one-line fix; file fetches injected so the checklist is testable offline), `site-files.ts`, `run-audit.ts`, `history.ts`. No headless browser.
- **API `app/api/growth/audit/`**: `run` (POST; admin or cron), `latest` (GET), `history` (GET `?kind=&days=`).
- **Admin UI `app/admin/authority/site-audit/page.tsx`** with tabs SEO / Technical / GEO: score rings (mobile+desktop), CWV cards, SEO health table, issues with severity, GEO checklist with fix hints, site-files status, trend line per score using `recharts`. "Run audit" via `AuthorityActionButton`. Honest empty states.
- **Script `scripts/run-growth-site-audit.ts`** (audits `NEXT_PUBLIC_SITE_URL`; non-zero exit on failure).
- **Tests `tests/growth-audit.test.ts`**: GEO checklist against inline HTML fixtures (pass and fail), render-blocking counter, Flesch formula, PSI response mapper against a recorded fixture object.

### WS3 - Signals, explainable lead scoring, outbound sequences
Replaces Pancake Outbound (Signals, Leads, Campaign) without LinkedIn session automation.

- **Migration `026_growth_signals_outbound.sql`**: `growth_signal_events` (`type` check in keyword|competitor|influencer|own_brand|hiring|stack|regulatory|manual, `source`, `company_name`, `company_domain`, `person_name`, `person_title`, `evidence jsonb`, `url`, `strength numeric`, `dedupe_key unique`, `detected_at`), `growth_lead_scores` (`lead_ref`, `lead_table`, `confidence numeric 0-100`, `factors jsonb` = array of {factor, weight, contribution, evidence, howToImprove}, `rationale`, `scored_at`), `growth_sequences` (`name`, `channel` check in email|linkedin_manual, `objective`, `calendar_link`, `steps jsonb`, `daily_cap`, `send_window jsonb`, `status`), `growth_sequence_enrollments` (`state` check in pending|awaiting_approval|active|replied|completed|stopped, `timeline jsonb`), `growth_outreach_tasks` (`kind` visit|like|connect|message|email, `draft_copy`, `status` check in queued|approved|done|skipped, `due_at`). RLS loop.
- **`lib/growth/signals/`**: `types.ts`; `providers/hiring.ts` (provider interface; JSearch via `JSEARCH_API_KEY` and Adzuna via `ADZUNA_APP_ID`/`ADZUNA_APP_KEY`, each reporting `configured:false` cleanly when unset), `providers/stack.ts` (own detector: fetch prospect homepage + `/security` + `/trust`, match fingerprints for Vanta/Drata/Secureframe/Sprinto trust centres and common analytics/chat tools; pure matcher exported), `providers/regulatory.ts` (bridge `discovered_leads` rows into signal events), `providers/manual.ts` (paste a LinkedIn post URL/text -> classify against the bundle with evidence), `run-signals.ts` (fan-out with `Promise.allSettled`, dedupe on `dedupe_key`).
- **`lib/growth/leads/explainable-score.ts`**: pure `scoreLeadExplainably(input, bundle)` -> confidence + factors (role match vs ICP roles, vertical, geography, company size, signal strength, recency, employer type) + "what would move the score". Contributions sum to the confidence; deterministic; clamped 0..100. `rationale.ts` calls `generateText()` only when a provider is configured, else a templated sentence.
- **`lib/growth/sequences/`**: `engine.ts` (step machine; every send-type step lands in `awaiting_approval` and creates a task with drafted copy; LinkedIn steps are never executed by code; email steps run `domain-deliverability` checks and use an `EmailSender` interface with a Resend adapter behind `RESEND_API_KEY`, else queue-only), `drafts.ts`, `caps.ts` (daily cap + send window in Europe/Berlin, pure with injected `now`).
- **API `app/api/growth/`**: `signals/configs`, `signals/run` (admin|cron), `signals/events`, `signals/manual`, `leads/score`, `leads/scores`, `sequences`, `sequences/[id]`, `sequences/[id]/enroll`, `enrollments/[id]/decision`, `tasks`, `tasks/[id]/done`.
- **Admin UI**: `signals/page.tsx`, `growth-leads/page.tsx` (factor breakdown bars + "what would move this"), `sequences/page.tsx` (step flow + approval queue).
- **Script `scripts/run-growth-signals.ts`**, gated on `LEAD_AUTOMATION_ENABLED`.
- **Tests `tests/growth-signals.test.ts`**: score determinism and factor-sum invariant; stack matcher on HTML fixtures; manual classifier; sequence engine never advances a send without approval; caps; dedupe.

### WS4 - Channel content agents + planner
Replaces Okara's Reddit / X / LinkedIn / Articles agents and Pancake's Content Planner.

- **Migration `027_growth_channel_content.sql`**: `growth_channel_drafts` (`channel` check in linkedin|x|reddit|article_brief|email, `status` check in draft|approved|scheduled|published|rejected, `title`, `body`, `source_ref jsonb`, `voice_snapshot jsonb`, `quality jsonb`, `rationale`, `scheduled_for`, `published_url`, `created_by`, `decided_by`), `growth_reddit_opportunities` (`subreddit`, `thread_url unique`, `title`, `snippet`, `matched_keywords text[]`, `score`, `status` check in new|drafted|skipped|answered, `found_at`), `growth_channel_settings` (per channel: `enabled`, `weekly_target`, `auto_draft`). RLS loop.
- **`lib/growth/channels/`**: `reddit-discovery.ts` (search `reddit.com/r/<sub>/search.json` with a descriptive User-Agent and 1 req/s throttle; OAuth via `REDDIT_CLIENT_ID`/`REDDIT_CLIENT_SECRET` when set; scores by keyword overlap + recency + comment count; skips accepted-answer and venting threads; pure parser and scorer exported), `draft.ts` (`draftForChannel(channel, brief, bundle)`; runs the quality gate; on failure regenerates exactly once with the reasons fed back; article_brief produces title/outline/target query/sources-needed and creates an opportunity via `createOpportunity`), `quality-gate.ts` (pure: length caps, em dash, banned terms, hashtags/emoji, regulatory-claim disclaimer requirement), `planner.ts` (weekly plan per settings; daily loop = 2 site-audit fixes, 1 article brief, 2 Reddit opportunities, 1 X post, 1 LinkedIn post; pure allocation function exported), `publish/` (`linkedin.ts` and `reddit.ts` record a user-pasted URL only; `x.ts` refuses any draft not `approved` and posts via X API v2 only when the four X vars exist).
- **API `app/api/growth/channels/`**: `drafts`, `drafts/[id]`, `drafts/[id]/decision`, `drafts/[id]/publish`, `reddit/discover` (admin|cron), `reddit/opportunities`, `planner/run` (admin|cron), `settings`.
- **Admin UI**: `planner/page.tsx` (Mon-Sun week grid, status pills, readiness checklist) and `channels/page.tsx` (agent cards per channel).
- **Script `scripts/run-growth-planner.ts`**.
- **Tests `tests/growth-channels.test.ts`**: quality gate catches em dash, banned terms, over-length, missing disclaimer; planner allocation; Reddit parser/scorer on a fixture; X publisher refuses unapproved drafts; manual publishers never call fetch.

### WS5 - AI CMO chat (tool-using agent) + MCP server
Replaces Okara's chat and Pancake's "Use in Claude / Codex".

- **Migration `028_growth_cmo.sql`**: `growth_cmo_threads`, `growth_cmo_messages` (`role`, `content`, `tool_calls jsonb`), `growth_cmo_actions` (`thread_id`, `kind`, `payload jsonb`, `status` check in proposed|confirmed|executed|rejected|failed, `result jsonb`, `proposed_by`, `decided_by`). RLS loop.
- **`lib/growth/cmo/`**: `tools.ts` (registry; each tool = name, description, JSON schema, `execute()`, `mutating`; read tools `get_brain`, `get_site_audit_summary`, `get_visibility_summary`, `get_leads_summary`, `get_channel_status`, `get_search_console_summary`; mutating tools return a **proposal** only: `propose_channel_draft`, `propose_site_audit_run`, `propose_signal_run`, `propose_brain_update`; all table reads tolerate missing tables and report "not available yet"), `agent.ts` (tool-use loop in the Anthropic Messages tools format; Bedrock when configured, else direct Anthropic; max 6 rounds; system prompt = CMO persona + `renderBrainContext()` + honest capability statement), `actions.ts` (proposed -> confirmed -> executed|failed, proposed -> rejected; confirm dispatches through a registered handler map), `store.ts`.
- **API**: `app/api/growth/cmo/threads` (GET/POST), `threads/[id]/messages` (GET, POST), `actions/[id]/confirm`, `actions/[id]/reject`.
- **Admin UI `app/admin/authority/cmo/page.tsx`** + `CmoChat.tsx`: thread list, message stream, tool-call chips, proposal cards with Confirm / Reject, a capability strip derived from provider status.
- **MCP server `app/api/mcp/route.ts`** (+ `lib/growth/mcp/server.ts`): Streamable HTTP JSON-RPC (`initialize`, `ping`, `tools/list`, `tools/call`). Read `/Users/jeremiahmatador/.claude/skills/mcp-server-patterns/SKILL.md` first. Bearer `MCP_ACCESS_TOKEN` (separate from `CRON_SECRET`), constant-time compare, 401 on bad token, 503 when unset. Read-only tools only, plus `list_personas`, `list_keywords`, `list_message_pillars`, `list_competitors`, `get_channel_voice`, `search_knowledge`. Client config documented in `docs/growth-engine/mcp.md`.
- **Tests `tests/growth-cmo.test.ts`**: mutating tools only ever return proposals; action state machine; agent loop stops at max rounds; MCP route rejects a bad token, 503s with none configured, lists tools with a good one, and exposes no `propose_*` tool.

### WS6 - Growth Command dashboard + integration (runs after WS1-WS5 merge)
- `app/admin/authority/growth/page.tsx`: SEO visibility score, AI visibility score, latest audit scores with deltas, leads by signal (7/30 days), sequence stats, planner week strip, and a "Needs your attention" queue aggregating outreach tasks awaiting approval, drafts awaiting decision, CMO proposals, failed jobs.
- Wire nav in `app/admin/authority/layout.tsx`: Growth, Brain, Site Audit, Signals, Growth Leads, Sequences, Planner, Channels, CMO.
- Add cron/worker entries to `render.yaml` (staging only; production pinned off), env vars to `.env.example` and `docs/ENVIRONMENT_SETUP.md`, README section, `docs/growth-engine/mcp.md` link.

---

## 5. Rules every builder agent follows

1. **Stay inside your file scope.** Do not edit `app/admin/authority/layout.tsx`, `render.yaml`, `README.md`, `docs/ENVIRONMENT_SETUP.md`, or another workstream's paths. Append new env vars to `.env.example` inside a clearly delimited `# --- Growth: <WS name> ---` block only.
2. **Patterns are not optional.** Store with seed fallback when `getSeoSupabase()` is null. `requireAuthorityApi` on every route (`allowCron: true` only for run/discover endpoints). `apiSuccess`/`apiError`. RLS loop from migration 014. Admin pages use `authority-module` / `authority-topbar` / `authority-panel`. `"server-only"` only in modules never imported by `scripts/` or `workers/`.
3. **LLM calls go through `lib/growth/llm.ts`. Context comes from `lib/growth/context.ts`.** Never call a provider directly, never re-describe the company in a prompt by hand.
4. **Never fabricate.** Missing credential -> `configured: false` and an honest UI label. No placeholder metrics.
5. **Never auto-send or auto-publish.** Every outbound message, post, or publish action is created in an approval state. LinkedIn steps are manual tasks with copy. Reddit is never posted automatically.
6. **Dependencies:** add only via `npm install --save <pkg>`, prefer none, and confirm `npm audit --omit=dev --audit-level=high` still passes.
7. **Commit incrementally.** Commit each coherent group of files as soon as it is written (migration, then each lib module, then routes, then UI, then tests). A session can be interrupted at any moment; uncommitted work is lost work. Do not save all commits for the end.
8. **Before reporting done:** `npm run lint && npm test && npm run typecheck` must all pass in your worktree. Run `npm run build` if time allows and report the result either way.
9. **Commit** on your `ws/<name>` branch with conventional messages ending in:
   ```
   Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
   ```
   Do not push. Do not touch `main`, `staging`, or `growth-engine`.
10. **Report back** in under 400 words: files added/changed, migration name, new env vars, what works with no credentials, what is stubbed, test/lint/typecheck/build results, anything you could not finish and why. Report anything with no clear home or outside your spec as an escalation instead of deciding it yourself.

---

## 6. Supervisor procedure

1. Job 0 runs on `growth-engine` directly; verify; commit.
2. Create worktrees: `git worktree add ../kodex-growth-ws/<name> -b ws/<name> growth-engine`, symlink `node_modules` from the main clone into each.
3. Launch WS1-WS5 with the briefs in section 4 and the rules in section 5. Collect reports. Verify each by rerunning lint/test/typecheck and reading the diff. Binary verdict: PERFECT or REJECTED with a numbered defect list back to the same worker. Three rejections on one deliverable -> escalate to Jeremiah.
4. Merge `ws/brain` first (it owns `lib/growth/context.ts`), then WS2-WS5 in order, resolving `.env.example`/`package.json` conflicts by hand.
5. On `growth-engine`: `npm ci`, `npm run lint`, `npm test`, `npm run typecheck`, `npm run build`, `npm audit --omit=dev --audit-level=high`.
6. Launch WS6 on the merged branch. Verify again. Apply migrations 024-028 to a Supabase branch or staging project, not production.
7. Hand back to Jeremiah: summary, verification results, and the ask to push `growth-engine` and open the PR against `main` (his release rule).

---

## 7. Open decisions for Jeremiah (defaults chosen so work is not blocked)

| Decision | Default taken | Change if |
|---|---|---|
| LinkedIn outreach automation | Manual tasks with drafted copy only | You accept LinkedIn ToS/ban risk on your own account |
| Reddit posting | Draft + approve, user posts manually | Never recommended to automate |
| Hiring-signal data source | Provider interface; JSearch/Adzuna adapters if keys are set | You pick a provider and add the key |
| Email sending | Resend adapter behind `RESEND_API_KEY`, otherwise queue-only | You prefer another ESP |
| MCP auth | Static bearer `MCP_ACCESS_TOKEN` | You want per-user OAuth later |
| Production autonomy for Growth jobs | Off (pinned), staging on | After a reviewed staging run |

---

## 8. Decisions log

| When | Decision / verdict |
|---|---|
| 2026-09-10 | Ruling: `signalConfigs` lives on the bundle only (matching the standalone `growth_signal_configs` table); channel voices carry no signal config. |
| 2026-09-10 | Ruling: seed values with no source in the repo read as unset ("Not set"), never a plausible guess. Headquarters is unset until supplied via the Brain UI. |
| 2026-09-10 | Ruling: the rendered Brain context must itself obey the voices' banned-term rules (no em dash in prompt text). |
| 2026-09-10 13:55 | **Incident:** the first working clone lived in the session `/tmp` scratchpad and was deleted by OS temp cleanup at 13:10, destroying the plan doc, the accepted Job 0 foundation, and five worktrees of in-progress WS work. Nothing had been pushed, so there was no remote copy. Ruling: all work now lives in `/Users/jeremiahmatador/kodex-growth`, outside `/tmp`; workers commit incrementally (rule 7). Cost if wrong: none, this is strictly safer. |
| 2026-09-10 13:55 | **Incident:** five parallel Sonnet builders exhausted the account session limit mid-run (reset 13:30). Ruling: dispatch in waves of at most two builders, largest first, rather than five at once. Cost if wrong: slower wall-clock, but survivable. |
| 2026-09-10 14:15 | Job 0 (foundation): rejection 1 of 3 — `extractFirstJson` counted delimiters without tracking string state, so valid model output containing an unbalanced brace or bracket inside a string was reported as failed. Fixed in a75c40c. Supervisor-verified: lint clean, 154/154, typecheck clean, plus 8 independent adversarial probes (unbalanced brace/bracket in string, escaped quote, trailing backslash, truncated object, fenced block, leading prose, no JSON) all behaving correctly. Verdict PERFECT. |
| 2026-09-10 14:15 | WS1 + WS2 dispatched (wave 1 of 3, sonnet), worktrees under `/Users/jeremiahmatador/kodex-growth-ws/`, BASE a75c40c. |
| 2026-09-11 | WS2 (site audits): rejection 1 of 3 — `latest` and `history` GET routes accepted `allowCron`, violating rule 2. Everything else supervisor-verified (166/166, lint, typecheck, tsx script exit codes, GEO/technical parsers on independent fixtures). |
| 2026-09-11 | Ruling: client components must not import from server modules that reach `lib/seo/db.ts`, even `import type`, because `tests/server-module-boundaries.test.ts` walks import specifiers without distinguishing type-only imports. Declare local structural prop types in the client component instead. Applies to WS1, WS3, WS4, WS5 UIs. |
| 2026-09-11 | Ruling: `npm run build` fails inside worktrees because Turbopack rejects the symlinked `node_modules`. Build is verified on `growth-engine` after merge, not in worktrees. |
| 2026-09-11 | Deferred minor (WS2): technical score penalises only render-blocking assets and cacheability; TTFB and byte size are reported but not scored. Revisit in final review. |
