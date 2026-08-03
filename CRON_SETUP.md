# SEO Cron Automation Setup Guide

This guide explains how to set up automated SEO cron jobs using GitHub Actions.

## Overview

The SEO engine needs to run daily to:
- Discover new leads
- Generate compliance content
- Score leads based on compliance maturity
- Update assessment data

The cron job is triggered via a GitHub Actions workflow that calls `/api/seo/cron` once daily.

## Quick Setup (5 minutes)

### 1. Generate Security Token

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output - this is your cron token.

### 2. Add GitHub Secrets

Go to **Settings** → **Secrets and variables** → **Actions** and create:

| Secret | Value |
|--------|-------|
| `SEO_CRON_TOKEN` | Your token from step 1 |
| `RENDER_APP_URL` | `https://kodex-leads.onrender.com` |

### 3. Update Render Environment

Add to Render dashboard environment variables:

```
SEO_CRON_SECRET_TOKEN=[your-token-from-step-1]
```

### 4. Test

Go to **Actions** tab → "SEO Automation Cron" → click "Run workflow"

## How It Works

1. **GitHub Actions** runs daily at 2 AM UTC
2. **Calls** your Render app at `/api/seo/cron` endpoint
3. **Authenticates** using the `SEO_CRON_TOKEN` header
4. **Executes** SEO automation logic (lead discovery, scoring, content generation)
5. **Logs** results visible in GitHub Actions

## Endpoint Protection

The `/api/seo/cron` endpoint checks for a valid token:

```typescript
export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  
  if (token !== process.env.SEO_CRON_SECRET_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // ... rest of cron logic
}
```

## Changing Schedule

Edit `.github/workflows/seo-cron.yml`:

```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # Change this line
```

Format: `minute hour day month weekday` (UTC)

Examples:
- `0 0 * * *` - Midnight UTC
- `0 6 * * *` - 6 AM UTC  
- `0 14 * * *` - 2 PM UTC
- `0 0 * * 0` - Every Sunday

## Monitoring

### GitHub Actions
- View in **Actions** tab
- Check logs for errors
- See execution time

### Render Logs
- Watch real-time execution
- Debug any failures
- Check database queries

### Manual Trigger
```bash
curl -X GET \
  -H "Authorization: Bearer [TOKEN]" \
  https://kodex-leads.onrender.com/api/seo/cron
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Workflow not running | Check `.github/workflows/seo-cron.yml` exists |
| 401 Unauthorized | Verify tokens match in GitHub Secrets and Render env |
| 404 Not Found | Check `/api/seo/cron` endpoint exists and deployed |
| Cron fails | Check Render logs for detailed error messages |

## Disabling

Add `if: false` to `.github/workflows/seo-cron.yml`:

```yaml
jobs:
  seo-automation:
    if: false
    runs-on: ubuntu-latest
```

## For More Details

See [HANDOFF.md](HANDOFF.md) for complete project documentation.
