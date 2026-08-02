# Kodex Search & LLM Authority Engine: Acceptance Tests

The implementation is not complete until these tests pass against the staging architecture.

## Repository and environment

- [ ] The implementation is built inside `Jeyday23/kodex-leads` and targets `staging`.
- [ ] Existing lead-generation and SEO routes still build and operate.
- [ ] Existing environment-variable names are reused.
- [ ] No secret values appear in source, logs, fixtures, documentation, commits or browser responses.
- [ ] Missing `CRON_SECRET` causes scheduled endpoints to return `503`.
- [ ] Invalid cron authorization returns `401`.

## Database

- [ ] A migration creates the Authority Engine tables, indexes and RLS policies.
- [ ] Migration is repeatable or safely guarded.
- [ ] Historical provider results are immutable through normal application APIs.
- [ ] Prompt edits do not alter prior `prompt_snapshot` values.
- [ ] Provider results, mentions and citations are linked to their run.
- [ ] Admin users can read and manage Authority Engine records.
- [ ] Unauthenticated users cannot access Authority Engine records.

## Prompt management

- [ ] Admin can create a prompt.
- [ ] Admin can edit prompt metadata.
- [ ] Admin can activate, pause and archive a prompt.
- [ ] Admin can assign a prompt to a group.
- [ ] Country and language are validated.
- [ ] Every mutation creates an audit-log record.
- [ ] Initial Kodex prompts can be seeded without duplication.

## Provider execution

- [ ] Manual execution can run one active prompt.
- [ ] Group execution can run multiple selected prompts.
- [ ] Scheduled execution uses deterministic idempotency keys.
- [ ] OpenAI uses the standing `OPENAI_API_KEY` and `OPENAI_MODEL` variables.
- [ ] Anthropic uses the standing `ANTHROPIC_API_KEY` and `CLAUDE_MODEL` variables.
- [ ] Perplexity uses the standing `PERPLEXITY_API_KEY` and `PERPLEXITY_MODEL` variables.
- [ ] An unconfigured provider is recorded as skipped, not treated as a system crash.
- [ ] One provider failure does not discard successful provider responses.
- [ ] Retryable failures use bounded retries with no more than three attempts.
- [ ] Latency and model are stored for generated responses.
- [ ] Raw response storage is server-side only.

## Extraction

- [ ] `Kodex` and `Kodex Compliance` mentions are detected case-insensitively.
- [ ] Brand aliases are loaded from project configuration.
- [ ] Direct `kodex-compliance.com` citations are identified.
- [ ] Citation URLs are normalized into URL and domain fields.
- [ ] Citation position is captured when supplied by the provider.
- [ ] Unlinked mentions and linked citations remain distinguishable.
- [ ] Configured competitor mentions are detected.
- [ ] Extraction confidence is persisted.
- [ ] Recommendation strength is persisted or explicitly null when unavailable.

## Dashboard

- [ ] `/admin/authority` displays mention rate, citation rate, provider coverage and visibility score from persisted records.
- [ ] Dashboard metrics support a date filter.
- [ ] Prompt Library supports the required lifecycle actions.
- [ ] Monitoring Runs lists status, prompt, trigger, providers and timestamp.
- [ ] Run detail displays answer snapshots without exposing raw secret-bearing payloads.
- [ ] Citations view groups data by URL and domain.
- [ ] Competitor view compares configured entities using stored evidence.
- [ ] Failures view displays retry state and sanitized errors.
- [ ] Settings displays provider configured/not-configured status only.
- [ ] Empty, loading and error states are usable.
- [ ] Lists are paginated.

## Compatibility

- [ ] `GET /api/seo/llm-sync` remains functional.
- [ ] Existing LLM provider adapters continue to support the SEO placement cycle.
- [ ] Existing Supabase fallback behavior is preserved where intended.
- [ ] Existing admin navigation remains usable.
- [ ] No connection is introduced to the Kodex customer application database.
- [ ] No automatic publishing is introduced.

## Quality gates

Run and pass the repository-equivalent commands:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Add focused tests covering:

- authorization failure modes
- provider isolation
- idempotency
- mention extraction
- URL normalization
- visibility-score calculation
- prompt snapshot immutability
- RLS or server authorization boundary

## Deployment verification

- [ ] Supabase migration procedure is documented.
- [ ] Render uses the existing secret environment and does not embed credentials in Blueprint files.
- [ ] The scheduled endpoint can be invoked with the standing `CRON_SECRET`.
- [ ] Health endpoint reports database and provider configuration state without secret values.
- [ ] Rollback procedure is documented.
- [ ] A smoke run creates one run, provider results, extraction records and visible dashboard metrics.

## Pull request requirements

The implementation PR into `staging` must include:

- architecture summary
- reused and changed modules
- migration instructions
- environment variables referenced, names only
- test results
- screenshots of core admin views
- deployment steps
- rollback steps
- known limitations
