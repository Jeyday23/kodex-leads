# Kodex SEO System - Live Deployment Guide

**Status:** ✅ Code Complete | 🔄 Awaiting Render Rebuild

---

## What's Ready

### SEO Engine (26 files committed)
- **Lead Capture:** `/api/leads` → scores (0-100) → routes to Slack/HubSpot
- **Assessment Pages:** `/assess/eu-ai-act`, `/assess/gdpr`, `/assess/nis2`
- **Admin Dashboards:** `/admin/leads` (inbox), `/admin/seo` (queue)
- **Automation:** `/api/seo/cron` (discovery, AI analysis, revalidation)
- **Content:** Sitemap, robots.txt, llms.txt, JSON-LD, meta tags
- **Database:** Supabase schema (migrations 010, 011) — optional, local storage works

### Commits Deployed
```
49c91e8 fix: simplify landing page and remove cruip component conflicts
b903a25 feat: finalize SEO engine with full automation and landing page integration
```

---

## Step 1: Force Render Rebuild

### Via Render Dashboard
1. Go to https://dashboard.render.com
2. Click **kodex-leads** service
3. Click **Manual Deploy** button
4. Wait 3-5 minutes for rebuild

### Verify Deployment Started
```bash
# Check live site shows latest commit
curl -I https://kodex-leads.onrender.com/ | grep HTTP

# Should return 200 OK (not 404)
```

---

## Step 2: Verify SEO Routes Are Live

After rebuild completes, test these endpoints:

### 2A: Lead Capture
```bash
curl -X POST https://kodex-leads.onrender.com/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "email": "prospect@acme.com",
    "companyName": "Acme Corp",
    "framework": "eu-ai-act",
    "companySize": "201-1000",
    "aiUse": "customer-facing",
    "complianceMaturity": "starting",
    "urgency": "this-quarter"
  }'

# Expected response:
# {
#   "status": "ok",
#   "persisted": true,
#   "storage": "local", (or "supabase" if configured)
#   "score": {
#     "score": 85-100,
#     "grade": "sales-ready",
#     "recommendedAction": "book-demo"
#   }
# }
```

### 2B: Admin Lead Inbox
```bash
# Should display captured leads
curl -s https://kodex-leads.onrender.com/admin/leads | grep -o "Total leads"
# Expected: "Total leads" visible in HTML
```

### 2C: Assessment Forms
```bash
# Forms should render and be ready to capture leads
curl -I https://kodex-leads.onrender.com/assess/eu-ai-act
# Expected: HTTP 200

curl -I https://kodex-leads.onrender.com/assess/gdpr
# Expected: HTTP 200

curl -I https://kodex-leads.onrender.com/assess/nis2
# Expected: HTTP 200
```

### 2D: Cron Automation Endpoint
```bash
# Should require CRON_SECRET (currently returns 503)
curl -I https://kodex-leads.onrender.com/api/seo/cron
# Expected: HTTP 503 or 401 (auth required)

# With correct secret:
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://kodex-leads.onrender.com/api/seo/cron
# Expected: {"status": "ok", "result": {...}}
```

### 2E: SEO Metadata
```bash
# Sitemap with all 22 pages
curl https://kodex-leads.onrender.com/sitemap.xml | head -10
# Expected: XML with <urlset> and compliance pages

# LLM Discovery File
curl https://kodex-leads.onrender.com/llms.txt | head -5
# Expected: Kodex platform description

# Robots.txt
curl https://kodex-leads.onrender.com/robots.txt
# Expected: User-agent rules for search engines
```

---

## Step 3: Optional - Set Up Supabase for Persistence

Currently, leads are stored locally in `.data/seo-store.json` (ephemeral).

To persist to Supabase:

### 3A: Add Supabase Env Vars to Render
```
NEXT_PUBLIC_SUPABASE_URL = https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY = eyJ... (your key)
```

### 3B: Push Migrations to Supabase
```bash
# From your local machine:
supabase db push --project-ref your-project-id

# Or via Supabase Dashboard:
# SQL Editor → Run migrations 010 and 011 manually
```

### 3C: Verify Connection
```bash
# After restart, check admin/leads persists data across reloads
curl https://kodex-leads.onrender.com/admin/leads
```

---

## Step 4: Integration Setup (Optional)

### Slack Notifications
```
SLACK_WEBHOOK_URL = https://hooks.slack.com/services/... (your webhook)
```
High-scoring leads auto-post to Slack channel

### HubSpot CRM Sync
```
HUBSPOT_PRIVATE_APP_TOKEN = pat-... (your token)
```
Sales-ready leads auto-create contacts in HubSpot

### AI Provider Analysis (for `/api/seo/llm-sync`)
```
ANTHROPIC_API_KEY = sk-ant-... (optional, Claude analysis)
OPENAI_API_KEY = sk-... (optional, ChatGPT analysis)
PERPLEXITY_API_KEY = ... (optional, Perplexity analysis)
```

---

## Troubleshooting

### Render Still Shows "Partner Sales Platform"
**Root Cause:** Render deployed from old commit
**Fix:**
1. Check Render deployment logs for actual commit SHA
2. Click **Manual Deploy** again
3. If still wrong, check if `master` branch is selected in settings
4. Last resort: create new Render service from scratch

### Lead Capture Returns 500 Error
**Check:**
```bash
# 1. Verify endpoint is live
curl -I https://kodex-leads.onrender.com/api/leads

# 2. Check Render logs for error details
# In Render dashboard → Logs tab

# 3. Verify .env vars are set (CRON_SECRET at minimum)
```

### Cron Endpoint Returns 404
**Root Cause:** API routes not deployed with latest code
**Fix:**
1. Verify `/api/seo/cron/route.ts` is in git: `git ls-files | grep cron`
2. Force rebuild on Render
3. Check Render build logs for errors

### Admin Dashboards Empty
**Expected:** Initially empty until leads captured
**Fix:** Submit a test lead via `/api/leads` first

---

## Local Testing (Before Render)

All functionality works locally:

```bash
# Start dev server
npm run dev

# Test lead capture
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","companyName":"Test","framework":"eu-ai-act","companySize":"201-1000","aiUse":"customer-facing","complianceMaturity":"starting","urgency":"this-month"}'

# View admin inbox
open http://localhost:3000/admin/leads

# Test cron (requires CRON_SECRET from .env.local)
curl -H "Authorization: Bearer test-cron-secret-local-development-only" \
  http://localhost:3000/api/seo/cron
```

---

## Deployment Checklist

- [ ] Manual Deploy triggered on Render
- [ ] `/api/leads` captures and scores leads
- [ ] `/admin/leads` displays captured leads
- [ ] Assessment forms (`/assess/*`) render correctly
- [ ] `/api/seo/cron` responds (503 = needs CRON_SECRET; expected)
- [ ] Sitemap and metadata correct
- [ ] (Optional) Supabase connected and migrations applied
- [ ] (Optional) Slack webhooks configured
- [ ] (Optional) HubSpot token configured

---

## What Happens When Live

### User Journey
1. User lands on https://kodex-leads.onrender.com
2. Clicks **"Start Assessment"** → `/assess/eu-ai-act`
3. Fills form → POST to `/api/leads`
4. Gets instant score (0-100) + recommendation
5. Lead appears in `/admin/leads` dashboard
6. (Optional) Slack alert sent to team
7. (Optional) Contact created in HubSpot

### Automation (Cron)
Every day (configurable):
1. Discover companies with compliance signals (hiring, press releases, SEC filings)
2. Run AI provider checks (Claude, ChatGPT, Perplexity) on generated pages
3. Revalidate publishable content
4. Update lead scores based on answer-engine visibility

---

## Support

**Code is production-ready.** This guide covers deployment verification only.

If Render still serves old content after rebuild:
- Check Render logs for deployed commit
- Verify GitHub webhook is connected
- Consider creating new Render service if deployment is corrupted

---

**Next:** Click "Manual Deploy" on Render, then verify endpoints above.
