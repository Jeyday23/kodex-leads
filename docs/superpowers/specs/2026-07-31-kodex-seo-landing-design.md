# Kodex SEO Acquisition — Public Landing Design

**Date:** 2026-07-31
**Status:** Approved, ready for implementation
**Repo:** `kodex-leads-seo-copy`

## Problem

The public root of this app is wrong in two ways, and both block the acquisition system from working as specified.

**1. `/` serves an internal ops console.** `app/page.tsx` is five lines rendering `SeoCommandCenter`, whose visible strings are "Run Lead Discovery", "Automation status", and "Discovered lead candidates". This is an admin dashboard occupying the public homepage. There is no marketing entry point.

**2. The content inventory is seeded to the wrong vertical.** Every page in `lib/seo/content.ts` carries `framework: "seo"`. The seed slugs are `llm-discovery`, `seo`, `google-vs-llm-search`, and `readiness-signals` — titled "LLM Discovery SEO Process", "SEO Automation Cadence", "Google Search vs LLM Discovery", "Answer Engine Readiness Signals".

The inventory is content *about SEO*. `docs/KODEX_SEO_SYSTEM_SPEC.md` states the objective is to "convert regulatory changes and search demand into authoritative pages" and to "keep public SEO inventory on the main Kodex domain." Left as-is, the engine will rank Kodex for SEO-tooling queries instead of EU compliance queries — it will generate traffic that cannot convert into compliance customers.

The engine architecture is correct. The routing, quality gate, attribution, lead scoring, and cron cycle all match the spec. Only the content vertical and the public entry point are wrong.

## Decisions

**The page sells Kodex compliance itself.** The SEO system is Kodex's customer-acquisition engine, not a product being sold. It stays the invisible machine behind the funnel.

**All three ICPs are in scope:**
- EU AI Act high-risk deployers
- Mid-market multi-framework compliance officers
- DACH self-serve SaaS founders

**The homepage routes rather than blends.** A single hero addressing all three converts none. This is viable here because the SEO engine delivers most buyers onto segment-matched cluster pages (`/learn`, `/compare`, `/deadlines`), not onto `/`. The homepage is a hub; segment-specific selling happens on the cluster pages that already exist.

## Timing

EU AI Act high-risk obligations become fully enforceable **August 2, 2026** — two days from this spec's date. Kodex GTM phase 1 is "EU AI Act content as lead magnets." The `/deadlines/[framework]` route already exists. Enforcement urgency is the hero, and it applies to all three ICPs.

The countdown must read from `/deadlines/[framework]` data so it rolls to the next enforcement date once August 2 passes. A hardcoded date becomes a stale page on August 3 and actively damages credibility.

## Architecture

### Route changes

| Route | Change |
|---|---|
| `/` | New marketing homepage |
| `/admin/seo` | Absorbs `SeoCommandCenter` (lead discovery, automation status) alongside existing publication/quality views |

`SeoCommandCenter` moves out of `app/page.tsx` unchanged in behavior. This is a relocation, not a rewrite.

### Content layer

Reseed the `framework` axis in `lib/seo/content.ts` with Kodex's nine frameworks:

`eu-ai-act`, `gdpr`, `nis2`, `dora`, `iso-27001`, `soc2`, `cra`, `product-liability`

Kodex's ninth framework, `custom`, is deliberately excluded. It is a product capability, not a search topic, and has no corresponding query demand to rank for.

Existing SEO-meta pages are reclassified `noindex` as internal documentation, or removed. They must not remain in the public indexable inventory.

`getSeoPagesForFramework` and `getSeoPageByRoute` need no signature change — they already accept an arbitrary framework string. This is a data change, not an interface change.

### Homepage sections

**1. Hero — enforcement countdown**
Live countdown to the next enforcement deadline, sourced from deadline data. Headline anchors on enforcement consequence, not product features. Primary CTA to `/assess/eu-ai-act`.

**2. Three lanes — self-select**
Each lane states the buyer's situation in their own words and forks into its own cluster and assessment:

| Lane | Entry cluster | Assessment |
|---|---|---|
| AI Act high-risk deployers | `/deadlines/eu-ai-act` | `/assess/eu-ai-act` |
| Mid-market multi-framework | `/compare/[slug]` | `/assess/gdpr` |
| DACH self-serve founders | `/learn/[framework]/[slug]` | `/assess/[framework]` |

**3. Proof — the scan engine**
Claude evidence synthesis, then batch evaluation, then skeptic/shadow pass, then counselor human verification. This human-in-the-loop verification is the differentiator against Vanta — not the framework count, which competitors can match.

**4. Comparison — EU-native vs US-centric**
Vanta at roughly $15K/yr against Kodex at €50–150/mo, with EU framework depth (NIS2, DORA, CRA) that US-centric tools cover weakly. Feeds the existing `/compare/[slug]` cluster.

**5. Close**
Free assessment, no card required.

### Visual direction

Editorial and regulatory-authority — closer to a legal publication than a SaaS landing page. This is a deliberate rejection of the default template look.

- **Palette (existing brand):** Purple `#A855F7`, Navy `#0F1F3D`, Ivory `#F7F4EF`, Teal `#0D9488`
- **Type:** serif display face for headlines against the existing sans for body. The countdown is the typographic centerpiece, set at display scale — not a widget inside a card.
- **Depth:** layered navy surfaces and overlap. Not uniform cards with drop shadows.
- **Rhythm:** intentional spacing variation between sections. Not uniform padding throughout.

### Instrumentation

Every lane carries attribution through the existing `POST /api/seo/attribution` and `POST /api/leads`, making lane-level conversion measurable from launch. Add `FAQPage` and `Event` JSON-LD to deadline pages through the existing `lib/seo/json-ld.ts`.

## Error handling

- **Deadline data unavailable:** hero falls back to a static enforcement statement without a countdown. It must never render a zeroed or negative timer.
- **All deadlines passed:** hero switches to an ongoing-obligation message rather than counting to a past date.
- **Assessment submission failure:** `POST /api/leads` failures surface a visible retry to the user. The lead must not be silently dropped — this is the revenue path.
- **Supabase unconfigured:** existing `.data/seo-store.json` local fallback continues to apply.

## Testing

- Unit: countdown rollover logic across the August 2 boundary, and the all-deadlines-passed case
- Unit: framework reseed — every seed page resolves through `getSeoPageByRoute`
- Integration: each lane CTA reaches its assessment with attribution intact
- E2E: full path from homepage lane through assessment to scored lead
- Visual regression at 320, 768, 1024, 1440
- Accessibility: keyboard navigation, contrast on navy surfaces, `prefers-reduced-motion` respected by the countdown

## Out of scope

- Rewriting `SeoCommandCenter` internals (relocation only)
- Changes to the cron cycle, quality gate, or LLM visibility sync
- Authoring the compliance content bodies themselves — this spec covers the framework axis reseed and routing, not editorial production
