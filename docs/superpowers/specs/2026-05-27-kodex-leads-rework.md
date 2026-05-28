# Kodex Leads Rework — From Marketing Clone to Lead Finder

> **Status:** Approved
> **Date:** 2026-05-27
> **Problem:** Landing pages replicated kodex-compliance.com instead of being lead capture tools

## Principle

"Free Compliance Tools by Kodex" — every page is either an interactive tool someone uses, or a dashboard a partner logs into. No product marketing, no pricing, no feature grids.

## Pages to DELETE

- `app/(marketing)/page.tsx` — product marketing homepage
- `app/(marketing)/pricing/page.tsx` — pricing belongs on kodex-compliance.com
- `app/(marketing)/resources/eu-ai-act/page.tsx` — static checklist, not interactive
- `app/(marketing)/resources/gdpr-checklist/page.tsx` — static checklist, not interactive
- `app/(marketing)/layout.tsx` — replaced by new layout

## Pages to BUILD

| Route | Purpose |
|-------|---------|
| `/` | Tool directory — countdown + 3 tool cards |
| `/assess/eu-ai-act` | EU AI Act Readiness Assessment (7-step quiz) |
| `/assess/gdpr` | GDPR Fine Risk Calculator |
| `/assess/frameworks` | Compliance Stack Audit (framework overlap) |

## Pages to KEEP (untouched)

- `/dashboard/*` — partner dashboard
- `/admin/*` — admin panel
- `/login` — magic link auth
- `/go/[code]` — referral redirect
- `/api/*` — all API routes
- All scrapers, scoring, integrations

## EU AI Act Assessment — 7-Screen Quiz

| Screen | Content | Captures | UI Pattern |
|--------|---------|----------|------------|
| 1 | "Are you ready for August 2?" + countdown | — | Hero + CTA button |
| 2 | "How large is your team?" | team_size | 4 radio cards |
| 3 | "Does your product use AI/ML?" | uses_ai, ai_types[] | Toggle + conditional chips |
| 4 | "What compliance measures exist?" | compliance_measures[] | Checklist (4 items) |
| 5 | "Which apply to you?" | existing_frameworks[] | Multi-select cards |
| 6 | Instant risk preview (gauge + 1 finding) | — | Color gauge, no gate |
| 7 | "Get your full report" | name, email, company | Form over blurred full report |

Results page: risk classification, 66-day action plan, comparison, single CTA to kodex-compliance.com.

## GDPR Fine Risk Calculator

Input: revenue range, data subjects count, data categories, cross-border transfers, has DPO.
Output: potential fine range (Art. 83 formula), 3 comparable enforcement cases.
Gate: full breakdown + action plan behind email.

## Compliance Stack Audit

Input: select frameworks needed (GDPR, AI Act, ISO 27001, NIS2, DORA, SOC 2).
Output: overlapping controls count, unique obligations, effort reduction percentage.
Gate: downloadable control mapping PDF behind email.

## Scoring Updates

New source values: `assessment_eu_ai_act`, `assessment_gdpr`, `assessment_frameworks`
Assessment source → +10 score bonus (higher intent than passive content)
No compliance measures + uses AI → additional +15 urgency bonus

## Data Model

Add `assessment_data jsonb` column to leads table for quiz answers and risk level.
New migration: `002_assessment_data.sql`
