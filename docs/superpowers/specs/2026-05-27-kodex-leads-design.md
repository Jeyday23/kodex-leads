# Kodex Leads — System Design Spec

> **Status:** Approved for implementation
> **Author:** Jeremiah + Claude Council (8 agents)
> **Date:** 2026-05-27
> **Repo:** kodex-leads (standalone, zero coupling to kodex-v3)

---

## 1. Purpose

Build a standalone lead generation and partner sales enablement system for Kodex Compliance. It generates leads through content funnels and GDPR-safe scraping, scores and routes qualified leads to commission-based sales partners, and tracks attribution through Stripe.

**Success criteria:**
- 50 leads/week captured within 30 days of launch
- 25% SQL rate (score ≥ 40)
- 15% close rate per partner within 90 days
- $0/month infrastructure cost

---

## 2. Constraints

| Constraint | Detail |
|-----------|--------|
| Budget | $0/month — all free tiers |
| Team | Solo founder + 1-3 freelance sales partners |
| Deadline | August 2, 2026 (EU AI Act enforcement) — 67 days |
| Legal | Must be GDPR-compliant. Kodex sells compliance — cannot be caught violating it. |
| Coupling | Zero dependency on Kodex v3 codebase or database |
| Scale | 1-3 partners, ~200 leads/month initially |

---

## 3. Architecture

### 3.1 System Boundary

```
                    ┌─────────────────────────┐
                    │      KODEX LEADS         │
                    │   (standalone Next.js)    │
                    │                           │
                    │  Landing   Partner  Admin  │
                    │  Pages     Dash     Panel  │
                    │     │        │       │     │
                    │     └────┬───┘───────┘     │
                    │          │                  │
                    │    Supabase (Postgres)      │
                    │    + Auth (magic link)      │
                    │    + RLS per partner        │
                    └────┬────┬────┬────┬────────┘
                         │    │    │    │
                    ┌────┘    │    │    └────┐
                    ▼         ▼    ▼         ▼
                 Stripe    Slack  HubSpot  PostHog
                 (read)   (alert) (CRM)   (analytics)
```

### 3.2 Tech Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Framework | Next.js 16, App Router, TypeScript | Founder expertise, handles pages + API + dashboard |
| Database | Supabase Free (PostgreSQL) | Built-in auth, RLS, realtime. 500MB storage, 50K MAU |
| Auth | Supabase magic link | No passwords. Partners click email link to login. |
| Hosting | Vercel Free | Zero-config Next.js deploy. Edge functions. Cron jobs. |
| Styling | Tailwind CSS | Fast prototyping. Matches Kodex brand system. |
| Validation | Zod | Type-safe input validation on all endpoints |
| Attribution | Stripe API (read-only) | Immutable checkout metadata. Hack-proof. |
| CRM | HubSpot Free API | 1M contacts. Deal pipelines. Partner ownership. |
| Analytics | PostHog Free (JS SDK) | 1M events/mo. Funnels. UTM attribution. |
| Notifications | Slack Incoming Webhook | Qualified lead alerts to shared channel. |
| Scheduling | Cal.com (embed) | Open source. Per-partner booking links. |
| Scraping | Playwright + Cheerio (Node.js) | Browser automation + HTML parsing for job boards/registries |
| Enrichment | Dropcontact + Hunter.io + Apollo.io | GDPR-safe email enrichment (EU-based providers first) |

### 3.3 Directory Structure

```
kodex-leads/
├── app/
│   ├── (marketing)/           # Landing pages — static, SEO
│   │   ├── page.tsx           # Homepage with countdown
│   │   ├── eu-ai-act/
│   │   └── gdpr-checklist/
│   ├── resources/
│   │   └── [slug]/            # Gated content pages
│   ├── (dashboard)/           # Partner-authenticated area
│   │   ├── layout.tsx         # Auth guard (Supabase)
│   │   ├── page.tsx           # Partner dashboard
│   │   └── resources/         # Battle cards, templates
│   ├── admin/                 # Founder-only admin panel
│   │   ├── layout.tsx         # Admin role check
│   │   └── page.tsx
│   ├── go/
│   │   └── [code]/            # Referral redirect: /go/alex → signup
│   │       └── route.ts
│   └── api/
│       ├── leads/
│       │   ├── route.ts       # POST: create + score lead
│       │   └── score/
│       │       └── route.ts   # POST: recalculate scores
│       ├── scraper/
│       │   ├── jobs/
│       │   │   └── route.ts   # POST: job board scraper
│       │   ├── startups/
│       │   │   └── route.ts   # POST: funded startup finder
│       │   ├── ai/
│       │   │   └── route.ts   # POST: AI company detector
│       │   └── enrich/
│       │       └── route.ts   # POST: email enrichment
│       ├── stripe/
│       │   └── conversions/
│       │       └── route.ts   # GET: read attributed conversions
│       ├── slack/
│       │   └── notify/
│       │       └── route.ts   # POST: send lead alert
│       ├── hubspot/
│       │   └── sync/
│       │       └── route.ts   # POST: push leads to CRM
│       └── cron/
│           └── route.ts       # GET: Vercel cron trigger
├── lib/
│   ├── supabase.ts            # Supabase client (server + browser)
│   ├── stripe.ts              # Stripe API client (read-only)
│   ├── scoring.ts             # Lead scoring engine
│   ├── slack.ts               # Slack webhook helper
│   ├── hubspot.ts             # HubSpot API helper
│   ├── scrapers/
│   │   ├── jobs.ts            # Job board scraper logic
│   │   ├── startups.ts        # Startup finder logic
│   │   ├── ai-companies.ts    # AI company detector logic
│   │   └── enrich.ts          # Email enrichment logic
│   └── utils.ts               # Shared utilities
├── components/
│   ├── countdown.tsx           # August 2 countdown timer
│   ├── lead-table.tsx          # Lead list with sorting/filtering
│   ├── score-badge.tsx         # Visual score indicator
│   ├── commission-card.tsx     # Commission summary card
│   └── capture-form.tsx        # Lead capture form with Zod
├── supabase/
│   └── migrations/
│       └── 001_initial.sql     # Tables, RLS policies, indexes
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-05-27-kodex-leads-design.md  # This file
├── .env.example
├── vercel.json                 # Cron config
├── package.json
└── tsconfig.json
```

---

## 4. Data Model

### 4.1 Entity Relationship

```
partners 1──────∞ leads
partners 1──────∞ conversions
leads    1──────∞ lead_events
leads    1──────1 conversions (optional)
scrape_runs (standalone log table)
```

### 4.2 Tables

**partners**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | Supabase auth.uid maps here |
| name | text | Partner display name |
| email | text UNIQUE | Login email (magic link) |
| code | text UNIQUE | Referral code: "ALEX25" |
| commission_rate | decimal | Default 0.15 (15%) |
| slack_handle | text | For mentions in alerts |
| role | text | 'partner' or 'admin' |
| status | text | 'active', 'paused', 'inactive' |
| created_at | timestamptz | |

**leads**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| email | text | Prospect email |
| company | text | Company name |
| team_size | text | '1-10', '11-50', '51-200', '200+' |
| uses_ai | boolean | Self-reported |
| funding_stage | text | 'pre-seed' through 'series-b', 'unknown' |
| source | text | 'organic', 'checklist', 'scraper_jobs', 'scraper_startups', 'scraper_ai', 'referral' |
| source_url | text | Where we found them |
| scrape_batch_id | uuid FK | Which scraper run |
| score | integer | Calculated by scoring engine |
| status | text | 'new' → 'qualified' → 'claimed' → 'contacted' → 'demo_booked' → 'converted' / 'lost' |
| partner_id | uuid FK | Assigned partner (nullable) |
| notes | text | Partner notes |
| created_at | timestamptz | |
| updated_at | timestamptz | Auto-updated |

**conversions**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| lead_id | uuid FK | |
| partner_id | uuid FK | |
| stripe_session_id | text UNIQUE | Stripe checkout session |
| stripe_customer_id | text | |
| plan | text | 'starter' or 'pro' |
| mrr | decimal | Monthly revenue |
| commission_amount | decimal | mrr × rate |
| paid_out | boolean | Has partner been paid |
| paid_at | timestamptz | When paid |
| created_at | timestamptz | |

**lead_events**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| lead_id | uuid FK | |
| event_type | text | 'form_submit', 'scan_complete', 'demo_booked', 'email_sent', 'upgraded', 'score_changed' |
| metadata | jsonb | Event-specific data |
| created_at | timestamptz | |

**scrape_runs**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| scraper_type | text | 'jobs', 'startups', 'ai', 'enrich' |
| started_at | timestamptz | |
| finished_at | timestamptz | |
| leads_found | integer | |
| leads_qualified | integer | Score ≥ 40 count |
| errors | jsonb | Error details |
| status | text | 'running', 'completed', 'failed' |

### 4.3 Row-Level Security

```
partners → authenticated users see only their own row
leads → partners see only leads where partner_id = auth.uid()
conversions → partners see only their own conversions
lead_events → partners see events for their leads only
scrape_runs → admin only
```

### 4.4 Indexes

```sql
create index idx_leads_status on leads(status);
create index idx_leads_score on leads(score);
create index idx_leads_partner on leads(partner_id);
create index idx_leads_source on leads(source);
create index idx_leads_created on leads(created_at);
create index idx_conversions_partner on conversions(partner_id);
create index idx_lead_events_lead on lead_events(lead_id);
create index idx_scrape_runs_type on scrape_runs(scraper_type);
```

---

## 5. Lead Scoring Engine

### 5.1 Scoring Rules

```typescript
function scoreLead(lead: Lead): number {
  let score = 0;

  if (lead.source === 'scraper_jobs')     score += 10;  // hiring compliance = needs tooling
  if (lead.source === 'scraper_ai')       score += 10;  // AI company = EU AI Act target
  if (lead.uses_ai)                       score += 25;  // self-reported AI usage
  if (lead.team_size === '11-50')         score += 20;  // sweet spot: too small for consultants
  if (lead.team_size === '51-200')        score += 15;  // mid-market
  if (['seed', 'series-a', 'series-b']
      .includes(lead.funding_stage))      score += 15;  // funded = can pay
  if (lead.source === 'checklist')        score += 10;  // downloaded content = engaged
  if (!isFreemailDomain(lead.email))      score += 5;   // work email = real prospect

  return score;
}
```

### 5.2 Qualification Threshold

- **Score ≥ 40** → status = `qualified`, Slack alert fired, HubSpot synced
- **Score 20-39** → status = `new`, stored for nurturing
- **Score < 20** → status = `new`, low priority

### 5.3 Score Recalculation

Scores recalculate when:
- New data added (e.g., funding stage enriched)
- Manual override by admin
- Scan completion event received

---

## 6. Scraper Specifications

### 6.1 Job Board Monitor

**Schedule:** Daily at 06:00 UTC via Vercel cron
**Sources:** Google Custom Search API, Indeed Publisher API, Arbeitnow API
**Keywords:** "DPO", "Data Protection Officer", "Compliance Officer", "Datenschutzbeauftragter", "GDPR", "EU AI Act"
**Geo filter:** Germany, Austria, Switzerland
**Deduplication:** By company name normalized (lowercase, trimmed)
**Output:** One lead per unique company, source = `scraper_jobs`

### 6.2 Funded Startup Finder

**Schedule:** Weekly on Mondays at 06:00 UTC
**Sources:** Handelsregister (unternehmensregister.de), EUStartups.com funding articles
**Filter:** Founded after 2020, HQ in DACH, tech/SaaS sector
**Enrichment:** Team size from company page or LinkedIn company
**Output:** One lead per unique company, source = `scraper_startups`

### 6.3 AI Company Detector

**Schedule:** Weekly on Wednesdays at 06:00 UTC
**Sources:** GitHub API (trending AI repos, EU developers), Product Hunt RSS (AI category), EU AI startup lists
**Filter:** Company HQ in EU, product involves AI/ML
**Signal strength:** These leads get +10 score bonus (EU AI Act urgency)
**Output:** One lead per unique company, source = `scraper_ai`

### 6.4 Email Enrichment

**Schedule:** Runs 1 hour after each scraper completes
**Pipeline:** Dropcontact → Hunter.io → Apollo.io (waterfall, stop at first hit)
**Input:** Company name + domain from scrapers 1-3
**Output:** Business email (e.g., info@, contact@, or founder pattern)
**Rate limits:** Dropcontact 25/trial, Hunter 25/mo, Apollo 150/mo = ~200 enrichments/month
**GDPR:** Only business emails. Document legitimate interest. Auto-purge after 90 days.

### 6.5 Legal Safeguards

All scrapers enforce:
1. Company data only — no personal data until enrichment via GDPR-safe APIs
2. `scrape_runs` audit log for every execution
3. Rate limiting to respect source servers (1 req/sec default)
4. Deduplication — never create duplicate leads for same company
5. Source URL stored on every lead for provenance
6. 90-day auto-purge on uncontacted leads (Supabase Edge Function or cron)

---

## 7. Integration Specifications

### 7.1 Stripe (Read-Only)

**Purpose:** Match conversions to partner referral codes
**API calls:**
- `stripe.checkout.sessions.list({ limit: 100, expand: ['data.metadata'] })` — paginate through recent sessions
- Filter by `metadata.partnerCode` or match by customer email
**Frequency:** Daily sync via cron, or on-demand from admin panel
**Auth:** `STRIPE_SECRET_KEY` from the Kodex v3 Stripe account. Create a restricted key in Stripe Dashboard with read-only access to Checkout Sessions and Customers only. Store in Vercel env vars.

### 7.2 Slack

**Purpose:** Alert partners when leads qualify
**Implementation:** Single incoming webhook URL
**Message format:**
```json
{
  "text": "New qualified lead!",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*New SQL:* Company Name\n*Score:* 65\n*Source:* Job board (hiring DPO)\n*AI:* Yes\n*Size:* 11-50\nFirst to claim in thread gets it."
      }
    }
  ]
}
```

### 7.3 HubSpot

**Purpose:** CRM for lead management beyond what the dashboard shows
**API:** HubSpot Free CRM API (v3)
**Sync:** Push new qualified leads as Contacts + Deals. Update deal stage on status change.
**Owner mapping:** Each partner is a HubSpot user → deal owner

### 7.4 PostHog

**Purpose:** Analytics, UTM attribution, funnel tracking
**Implementation:** `posthog-js` SDK in Next.js client
**Events tracked:** page_view, form_submit, lead_captured, lead_qualified, partner_login, conversion
**UTM params:** Captured on every landing page visit, stored in PostHog and on lead record

### 7.5 Cal.com

**Purpose:** Demo booking for partners
**Implementation:** Embedded iframe on partner dashboard + per-partner booking links
**Setup:** Each partner creates a Cal.com account, links shared in their dashboard profile

---

## 8. Security

Per the claude-security skill and Vibe Coder Checklist:

### 8.1 Authentication & Authorization

- Supabase Auth with magic link (no passwords)
- RLS on all tables — partners see only their own data
- Admin role check on `/admin` routes (app-level)
- No session tokens in localStorage — httpOnly cookies only

### 8.2 Input Validation

- Zod schemas on every API endpoint
- Email validation with domain check (reject freemail on lead capture)
- Rate limiting: Vercel Edge middleware + Upstash Redis free tier
- Max request body size enforced

### 8.3 Secrets Management

- All secrets in Vercel environment variables (not in code)
- `.env.example` with placeholder values committed
- `.env.local` in `.gitignore`
- No `NEXT_PUBLIC_` prefix on sensitive keys

### 8.4 Data Protection

- GDPR legitimate interest documented
- 90-day auto-purge on uncontacted scraped leads
- Opt-out mechanism in first partner outreach
- No PII in server logs
- Scraper audit trail in `scrape_runs` table

### 8.5 Headers

- Content-Security-Policy (nonce-based, no unsafe-inline)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security: max-age=31536000
- Referrer-Policy: strict-origin-when-cross-origin

---

## 9. Landing Page Design System

Built using the design methodology proven on Neuridion — applied fresh to Kodex Leads with its own identity and voice.

### 9.1 Design Methodology

These are the proven principles that drive high-converting pages for regulatory/compliance audiences:

1. **Show real output** — the hero features an actual product artifact (a real compliance gap scan, a real checklist excerpt), never a generic illustration or dashboard mockup
2. **Structured information hierarchy** — content flows in a clear visual hierarchy. Regulatory professionals are trained to scan structured documents, so design like a well-formatted report, not a marketing brochure
3. **Scannable over readable** — bullet points, numbered lists, and data cards over long paragraphs. Every section earns its screen space
4. **Precision aesthetic** — the visual language communicates rigor and trustworthiness. Clean lines, consistent spacing, restrained color use. This is a compliance product — the design is the first proof of competence
5. **Urgency without panic** — the EU AI Act deadline creates natural urgency. Use it through countdowns and clear deadlines, not through alarm-bell marketing tactics
6. **Standalone brand** — Kodex Leads pages don't reference competitors and don't look like every other SaaS landing page. The Kodex brand (purple, navy, teal) is the design foundation

### 9.2 Brand Tokens

**Colors** — from the Kodex Compliance brand system:

| Role | Color | Usage |
|------|-------|-------|
| Primary | Purple `#A855F7` | Brand accent, interactive elements, highlighted tier |
| Anchor | Navy `#0F1F3D` | Headings, dark sections, footer, CTAs |
| Signal | Teal `#0D9488` | Labels, icons, success states, secondary accent |
| Warm neutral | Ivory `#F7F4EF` | Alternate section backgrounds |

Derive text, muted, border, and background shades from these during implementation — don't pre-specify every hex code in the spec. The designer (you, at build time) picks values that work with the brand palette.

**Typography direction:**
- Headings: bold, tight tracking, navy — authoritative
- Labels/tags: monospace, uppercase, small — technical precision
- Body: clean sans-serif, relaxed leading — readable at any length
- Specific sizes and weights chosen during implementation to match content density

### 9.3 Section Anatomy

Every landing page section follows this structure:

```
[Optional: colored section label — monospace, uppercase, accent color]
[Heading — bold, tight, concise statement]
[Content — grid, cards, bullet list, or feature showcase]
[Optional: CTA or transition to next section]
```

Sections alternate between white and tinted backgrounds to create visual rhythm without decorative elements.

### 9.4 Page Structure: Homepage

| Section | Purpose | Key Content |
|---------|---------|-------------|
| Nav | Persistent wayfinding | Logo + links + primary CTA button. Sticky. |
| Hero | Hook + urgency | EU AI Act countdown ("X days left"), 3-bullet value prop, primary CTA, real product output card |
| Social proof | Trust (when available) | Partner logos or "X startups" counter. Skip until real numbers exist. |
| How it works | Demystify the product | 3-step numbered grid: simple action → outcome per step |
| Features/Sources | Show depth | Grid of capability cards (frameworks, databases, integrations) |
| Pricing | Convert | 3-tier layout (Free/Starter/Pro), recommended tier visually emphasized |
| Final CTA | Close | Dark background, direct headline, single action button |
| Footer | Navigation + legal | Link columns + legal links + brand tagline |

### 9.5 Page Structure: Gated Content (EU AI Act / GDPR Checklist)

| Section | Purpose | Key Content |
|---------|---------|-------------|
| Nav | Same as homepage | |
| Hero | Promise + capture | Framework name, what's in the checklist (bullets), lead capture form |
| Preview | Prove value before gate | Show 2-3 real checklist items, blur/fade the rest |
| Trust signal | GDPR credibility | "We practice what we preach" + compliance badges |
| CTA | Redundant capture | Repeat form or scroll-to-form button |
| Footer | Same as homepage | |

**Lead capture form fields:** name, work email, company, team size, uses AI (boolean). Validated with Zod client-side.

### 9.6 Component Inventory

These components will be built during implementation. The spec defines *what* each does, not *how* it looks pixel-by-pixel:

| Component | Responsibility |
|-----------|---------------|
| `StickyNav` | Logo, links, CTA, mobile hamburger menu |
| `Countdown` | Days/hours/minutes until August 2, 2026. Auto-updates. |
| `ProductCard` | Displays a real product output (scan result, report excerpt) |
| `StepGrid` | Numbered 3-column grid for "how it works" flow |
| `PricingTable` | 3-tier pricing with feature comparison |
| `CaptureForm` | Lead capture with Zod validation + scoring on submit |
| `FeatureCard` | Icon + title + short description for feature grids |
| `CTASection` | Dark background call-to-action block |
| `AnimatedSection` | Scroll-triggered fade-in wrapper (IntersectionObserver, CSS transitions) |
| `MobileNav` | Hamburger overlay for mobile breakpoints |

### 9.7 Animation Approach

- CSS transitions only — no heavy animation libraries
- Scroll-triggered entrances via IntersectionObserver (fade + subtle translateY)
- Stagger children in grids for visual flow
- Respect `prefers-reduced-motion` — disable all animations when set
- Animations enhance, never gate content (no waiting for animations to complete)

### 9.8 Responsive Strategy

- **Mobile-first** build with Tailwind responsive prefixes
- Single column on mobile, 2-col on tablet, full grid on desktop
- Touch targets minimum 44px
- Nav collapses to hamburger on mobile
- Complex visual treatments (overlapping cards, rotations) simplified or removed on small screens
- Content priority stays the same across breakpoints — just the layout adapts

---

## 10. Deployment Plan

| Step | Action | Time |
|------|--------|------|
| 1 | Create `kodex-leads` GitHub repo | 5 min |
| 2 | `npx create-next-app@latest --typescript --tailwind --app` | 2 min |
| 3 | Create Supabase Free project, run migration SQL | 15 min |
| 4 | Connect repo to Vercel, deploy | 5 min |
| 5 | Set environment variables in Vercel | 10 min |
| 6 | Build landing pages (homepage + EU AI Act + GDPR checklist) | 4 hrs |
| 7 | Build lead capture form + scoring engine | 2 hrs |
| 8 | Build partner dashboard (auth + leads + conversions) | 4 hrs |
| 9 | Build admin panel | 2 hrs |
| 10 | Build scrapers (4 scrapers + cron config) | 4 hrs |
| 11 | Integrate Stripe read, Slack, HubSpot, PostHog | 3 hrs |
| 12 | Security hardening (headers, RLS, rate limiting, Zod) | 2 hrs |
| 13 | Create partner accounts, test full flow | 1 hr |
| 14 | Launch | - |
| **Total** | | **~37 hours** |

---

## 11. What's Explicitly Out of Scope

- Changes to Kodex v3 codebase
- Email sending from the app (partners use own channels)
- Payment processing (stays in Kodex v3)
- Partner self-registration (manual creation for 1-3 partners)
- Complex CRM workflows (HubSpot handles externally)
- LinkedIn scraping (ToS violation, GDPR risk)
- Mobile app

---

## 12. Future Extensions (Not Now)

- **v3 integration:** 5-line cookie middleware in Kodex v3 for seamless referral tracking
- **Partner self-serve portal:** Application + approval flow when scaling beyond 3 partners
- **Email sequences:** Automated nurture emails for leads scoring 20-39
- **White-label reports:** Branded compliance gap reports partners can send to prospects
- **Multi-language:** German-language dashboard for DACH partners
- **Affiliate program:** Public referral program open to anyone (Phase 3-4 GTM)
