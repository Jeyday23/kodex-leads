# Outbound-First Prospecting Platform

> **Status:** Approved
> **Date:** 2026-05-27
> **Problem:** Dashboard was a passive lead viewer, not an active prospecting tool

## Principle

"Open dashboard, find the right person, reach out." Every screen serves the sales partner's daily workflow. No vanity metrics, no passive browsing.

## Database Changes

### New table: `contacts`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid PK | default gen_random_uuid() |
| lead_id | uuid FK→leads | NOT NULL, ON DELETE CASCADE |
| name | text | NOT NULL |
| title | text | NOT NULL |
| email | text | |
| linkedin_url | text | |
| phone | text | |
| enrichment_source | text | CHECK (apollo, hunter, manual, dropcontact) |
| created_at | timestamptz | default now() |

RLS: partner sees contacts for their claimed leads + unclaimed qualified leads. Admin sees all.

### Update leads table

Add column: `outreach_status text NOT NULL DEFAULT 'not_contacted'`
CHECK: not_contacted, emailed, replied, meeting_booked, converted, not_interested

New migration: `004_contacts_outreach.sql`

## Enrichment Upgrade

Expand Apollo people search to find decision makers by title at each scraped company.

Priority titles (searched in order):
1. Data Protection Officer / DPO / Datenschutzbeauftragter
2. Head of Legal / General Counsel / Rechtsabteilung
3. CTO / VP Engineering / Head of Engineering
4. CEO / Founder / Geschaeftsfuehrer (companies < 50 employees)

Store each person found as a contact row. One lead → multiple contacts.

Enrichment runs as part of daily cron after scraping.

## Dashboard Pages

### `/dashboard` — Prospecting Feed

Top 20 prospects sorted by score descending, only shows leads with status `qualified` or `not_contacted`.

Each prospect card:
- Company name + score badge + signal pills (Uses AI, Hiring DPO, Series A, etc.)
- Contact card(s): name, title, email (copy), LinkedIn (open), phone (copy)
- Quick actions: Mark Emailed, Book Meeting, Skip
- If multiple contacts, stack them with primary (highest-priority title) on top

### `/dashboard/leads` — Full Company List

Table with expandable rows. Click company → see all contacts + outreach history.
Columns: Company, Score, Contacts count, Source, Outreach Status, Last Activity.
Filters: status, source, has_contacts, outreach_status.

### `/dashboard/pipeline` — Pipeline View (replaces conversions)

Kanban-style columns:
- Not Contacted (count)
- Emailed (count)
- Replied (count)
- Meeting Booked (count)
- Converted (count)

Each card: company name, primary contact, days in stage.
Click card → opens lead detail.

### `/dashboard/resources` — Keep As-Is

Sales materials, battle cards, templates.

## Email Templates

3 built-in templates stored as constants (not DB):

1. **EU AI Act Deadline** — cold outreach leveraging August 2 urgency
2. **Hiring Signal** — personalized for companies hiring DPO/compliance roles
3. **Assessment Follow-up** — for inbound leads who completed an assessment

Templates use merge fields: `{{company}}`, `{{contact_name}}`, `{{title}}`

Rendered in a modal with copy-to-clipboard button.

## API Changes

### New: `PATCH /api/leads/[id]/outreach`
Update outreach_status. Auth required. Partner must own (claimed) the lead.

### New: `GET /api/leads/[id]/contacts`
Return contacts for a lead. Auth required.

### Update: `GET /api/cron`
After scraping + basic enrichment, run decision-maker enrichment pass.

## Scoring Updates

Add signal-based context to prospect cards:
- `uses_ai` → "Uses AI" pill
- `source === "scraper_jobs"` → "Hiring Compliance" pill
- `funding_stage in (seed, series-a)` → "Recently Funded" pill
- `compliance_measures_count === 0` → "No Compliance" pill (from assessment data)
- `team_size 51-200` → "Scale-up" pill

## Security

- All new endpoints require auth (Supabase session)
- Outreach status updates scoped to partner's claimed leads via RLS
- Contacts table RLS: see contacts for own leads + unclaimed qualified leads
- Rate limiting on outreach status updates
- No PII in error responses
