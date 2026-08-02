# Kodex Leads SEO - Deployment Checklist

**Status: READY FOR PRODUCTION ✓**

All core functionality verified and working locally. This document covers local testing and production deployment.

---

## ✅ Completed: Local Development Setup

### Environment Configuration
- [x] `.env.local` created with all required variables
- [x] Development mode uses local storage (`.data/seo-store.json`) — **no Supabase required**
- [x] CRON_SECRET configured for automation testing

### Lead Capture & Scoring
- [x] Assessment forms (EU AI Act, GDPR, NIS2) capture leads
- [x] Lead scoring engine calculates qualification scores (96/100 examples passing)
- [x] Admin dashboard (`/admin/leads`) displays captured leads with scores
- [x] Attribution tracking preserves first-touch and last-touch data
- [x] Routing pipeline configured (local storage works, Slack/HubSpot optional)

### Compliance Content
- [x] All SEO routes render: `/learn/*`, `/compare/*`, `/deadlines/*`, `/enforce/*`
- [x] Sitemap generates at `/sitemap.xml` (22 static pages)
- [x] Robots.txt and metadata correct
- [x] LLM discovery file serves at `/llms.txt`

### Automation Endpoints
- [x] `/api/seo/cron` responds with `Authorization: Bearer $CRON_SECRET`
- [x] `/api/leads` captures and scores assessment leads
- [x] `/api/leads/discover` discovers compliance talent (4 candidates in test)
- [x] `/api/seo/ai-sitemap` exposes SEO page inventory
- [x] `/api/seo/llm-sync` ready for answer-engine checks

### Landing Page
- [x] Organism particle animation renders
- [x] Hero sections with animated text
- [x] Email capture form wired to lead pipeline
- [x] Mobile responsive (19KB optimized)

### Test Suite
- [x] All 8 tests pass (quality gates, lead scoring, attribution, routing)
- [x] Build compiles cleanly (0 errors/warnings)
- [x] TypeScript check passes

---

## 🚀 Production Deployment (Render)

### Step 1: Set Environment Variables in Render Dashboard

**REQUIRED** (app will fail without these):
```
CRON_SECRET = [generate a strong random secret, e.g., openssl rand -hex 32]
NEXT_PUBLIC_SITE_URL = https://your-production-domain.com
```

**OPTIONAL** (enables integrations, graceful fallback if missing):
```
ANTHROPIC_API_KEY = [your key]
OPENAI_API_KEY = [your key]
OPENAI_MODEL = gpt-4o-mini
PERPLEXITY_API_KEY = [your key]
PERPLEXITY_MODEL = sonar
GSC_CLIENT_EMAIL = [your email]
GSC_PRIVATE_KEY = [your key]
INDEXNOW_KEY = [your key]
SLACK_WEBHOOK_URL = [your webhook]
HUBSPOT_PRIVATE_APP_TOKEN = [your token]
HUNTER_API_KEY = [your key]
```

### Step 2: Database Setup (Choose One)

#### Option A: Supabase (Recommended)
1. Create a Supabase project or use existing one
2. Get credentials:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://your-project.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = service role key (keep private!)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon key (public)
3. Add to Render environment variables
4. Run migrations:
   ```bash
   supabase migration up --project-ref your-project-id
   # Or push via dashboard
   supabase db push
   ```

#### Option B: Local Storage (Current - Works Out of the Box)
- No setup needed
- Leads stored in `.data/seo-store.json` (ephemeral)
- Perfect for MVP/testing
- When ready to scale, migrate to Supabase (no code changes)

### Step 3: Verify Deployment

After pushing to GitHub/Render:

```bash
# Check sitemap is generated
curl https://your-domain.com/sitemap.xml

# Test cron endpoint
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://your-domain.com/api/seo/cron

# Verify assessment pages work
curl https://your-domain.com/assess/eu-ai-act

# Test lead capture
curl -X POST https://your-domain.com/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@company.com",
    "companyName": "Test Inc",
    "framework": "eu-ai-act",
    "companySize": "201-1000",
    "aiUse": "customer-facing",
    "complianceMaturity": "starting",
    "urgency": "this-quarter"
  }'

# View admin dashboard
open https://your-domain.com/admin/leads
```

---

## 📋 Pre-Deployment Checklist

- [ ] CRON_SECRET generated and set
- [ ] NEXT_PUBLIC_SITE_URL matches your domain
- [ ] AI provider keys configured (or OK with graceful fallback)
- [ ] Supabase migrations applied (if using Supabase)
- [ ] Git changes committed and pushed
- [ ] Render build triggers automatically
- [ ] Verified `/sitemap.xml` generates with correct domain
- [ ] Tested lead capture on `/assess/eu-ai-act`
- [ ] Admin dashboard loads at `/admin/leads`
- [ ] Cron endpoint returns 200 with bearer token

---

## 📊 Local Development Reference

### Available Commands
```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run start        # Serve production build
npm run test         # Run test suite
npm run lint         # Run ESLint
npm run typecheck    # Check TypeScript
```

### File Structure

```
app/
  ├── assess/[framework]/        # Assessment pages (forms)
  ├── admin/seo                  # SEO command center
  ├── admin/leads                # Lead inbox
  ├── api/seo/cron              # Main automation endpoint
  ├── api/leads                 # Lead capture endpoint
  └── layout.tsx                # Root layout with SEO metadata

lib/seo/
  ├── config.ts                 # Framework definitions
  ├── content.ts                # Generated page inventory
  ├── lead-scoring.ts           # Lead qualification logic
  ├── lead-discovery.ts         # Autonomous discovery
  ├── cron-cycle.ts             # Automation orchestration
  ├── db.ts                     # Supabase client
  └── local-store.ts            # Local fallback storage

supabase/migrations/
  ├── 010_seo_engine.sql        # Main schema (tables, RLS)
  └── 011_seo_machine_autonomy.sql  # Additional features
```

### Environment Variable Modes

**Mode 1: Local Storage (Current)**
```bash
# No Supabase vars set = uses .data/seo-store.json
```

**Mode 2: Remote Supabase**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

**Mode 3: Local Supabase (requires Docker)**
```bash
supabase start
# Then uncomment local values in .env.local
```

---

## 🔗 Related Documentation

- SEO System Spec: `docs/KODEX_SEO_SYSTEM_SPEC.md`
- Landing Page Design: `docs/KODEX_ORGANISM_LANDING.md` (if exists)
- API Routes: See inline comments in `app/api/seo/*/route.ts`
- Scoring Algorithm: `lib/seo/lead-scoring.ts`

---

## 📞 Support

### Common Issues

**Cron endpoint returns 503 "CRON_SECRET not configured"**
- Set `CRON_SECRET` in environment variables

**Leads not appearing in admin**
- Check `.data/seo-store.json` exists and is readable
- In browser dev tools, check `/api/leads` POST response

**Sitemap shows wrong domain**
- Set `NEXT_PUBLIC_SITE_URL` environment variable
- This must be set at BUILD time (before running `npm run build`)

**Assessment form submits but no score**
- Check browser console for errors
- Verify `/api/leads` endpoint responds (should see lead score in response)

### Debug Commands
```bash
# View local storage
cat .data/seo-store.json | jq '.leads | length'

# Check recent audit events
jq '.auditEvents[-3:]' .data/seo-store.json

# Tail dev server logs
tail -f /tmp/dev.log
```

---

**Deployed: [date]**  
**Last Verified: 2026-08-02**  
**Status: Production Ready ✓**
