# Kodex Search & LLM Authority Engine

Build the Kodex Search & LLM Authority Engine inside the existing `Jeyday23/kodex-leads` Next.js repository.

The engine is an internal dashboard and automation layer for monitoring whether Kodex is mentioned and cited by LLM/search-answer providers. It must reuse the existing Render, Supabase, GitHub, and environment-variable infrastructure. Do not create a parallel app or deployment surface.

## Objectives

- Monitor prompts across OpenAI, Anthropic, and Perplexity using the existing API-key variable names.
- Preserve prompt text, provider/model, search mode, country, language, full answer snapshot, citation URLs, competitors, sentiment, confidence, cost, and latency.
- Provide internal dashboard pages for overview, prompts, monitoring runs, citations, competitors, history, failures, and settings.
- Store production data in Supabase with row-level security enabled.
- Keep service-role access in server-only code and workers.
- Run background/scheduled monitoring through Render workers or cron jobs.
- Retain raw provider responses for verification.

## Boundaries

- No ChatGPT Sites deployment.
- No connection to the Kodex production customer database.
- No automated website publishing in phase one.
- No crawling behind authentication.
- No `NEXT_PUBLIC_*` secrets.
- API keys must be read from Render environment variables only.

## Required Environment Variables

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

Optional existing variables such as `NEXT_PUBLIC_SITE_URL`, `SLACK_WEBHOOK_URL`, `HUBSPOT_PRIVATE_APP_TOKEN`, `HUNTER_API_KEY`, and Google Search Console credentials remain owned by the existing app.

## Acceptance

- The app builds and tests in the current environment.
- Authority Engine pages exist under the internal admin surface.
- Automation endpoints fail closed without `CRON_SECRET`.
- Provider adapters skip missing credentials without exposing values.
- Supabase migration creates Authority Engine tables and enables RLS.
- Render configuration describes web, worker, and cron execution.
