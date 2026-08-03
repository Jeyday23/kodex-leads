# SEO Cron Automation Setup Guide

This guide explains how to set up automated SEO cron jobs using GitHub Actions.

## Overview

The SEO engine needs to run daily to:
- Discover new leads
- Generate compliance content
- Score leads based on compliance maturity
- Update assessment data

The cron job is triggered via a GitHub Actions workflow that calls `/api/seo/cron` once daily.

## Setup Instructions

### Step 1: Generate a Cron Secret Token

Create a secure token to protect the cron endpoint:

```bash
# Generate a random token (run in terminal)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Save this token - you'll need it for the next steps.

### Step 2: Add GitHub Secrets

Go to your GitHub repository settings:

1. Navigate to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add these two secrets:

| Secret Name | Value |
|------------|-------|
| `SEO_CRON_TOKEN` | The token you generated in Step 1 |
| `RENDER_APP_URL` | Your Render app URL (e.g., `https://kodex-leads.onrender.com`) |

### Step 3: Update the Cron Endpoint

Update `/api/seo/cron` to validate the token:

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (token !== process.env.SEO_CRON_SECRET_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ... rest of cron logic
}
```

### Step 4: Add Token to Environment Variables

Add to Render environment variables:

```
SEO_CRON_SECRET_TOKEN=[the-token-you-generated]
```

### Step 5: Verify the Workflow

1. Go to **Actions** tab in GitHub
2. Look for "SEO Automation Cron" workflow
3. It should show scheduled runs at 2 AM UTC daily
4. Click to view logs and verify it's working

## Manual Testing

To test the cron job manually:

```bash
curl -X GET \
  -H "Authorization: Bearer [YOUR_TOKEN]" \
  https://kodex-leads.onrender.com/api/seo/cron
```

Or use the GitHub Actions "Run workflow" button to trigger it immediately.

## Troubleshooting

### Workflow not running
- Check that the workflow file exists at `.github/workflows/seo-cron.yml`
- Verify the cron syntax is correct (uses UTC time)
- Go to Actions tab and check for any errors

### 401 Unauthorized errors
- Verify `SEO_CRON_SECRET_TOKEN` is set correctly in GitHub Secrets
- Verify `SEO_CRON_SECRET_TOKEN` env var is set in Render
- Tokens must match exactly

### 404 errors
- Verify `RENDER_APP_URL` is correct (e.g., `https://kodex-leads.onrender.com`)
- Ensure the `/api/seo/cron` endpoint exists and is deployed
- Check Render deployment logs

### Cron job failing
- Check Render application logs for errors
- Verify Supabase is accessible
- Check that all required environment variables are set
- Review the API response for specific error messages

## Cron Schedule

Current schedule: **2 AM UTC daily**

To change the schedule, edit `.github/workflows/seo-cron.yml`:

```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # Change the time here (HH MM * * *)
```

Cron time format: `MM HH * * *` (minute hour day month weekday)

Common times:
- `0 0 * * *` - Midnight UTC
- `0 6 * * *` - 6 AM UTC
- `0 12 * * *` - Noon UTC

## Monitoring

To monitor the cron job:

1. **GitHub Actions**: View workflow runs and logs in the Actions tab
2. **Render Logs**: Check application logs in Render dashboard
3. **Supabase**: Monitor database activity in Supabase dashboard
4. **Email Alerts**: Add notification rules to GitHub Actions (optional)

## Disabling the Cron

If you need to temporarily disable the cron job:

1. Go to `.github/workflows/seo-cron.yml`
2. Add `if: false` to the job:
   ```yaml
   jobs:
     seo-automation:
       if: false
       runs-on: ubuntu-latest
   ```
3. Commit and push the change

To re-enable, remove the `if: false` line.

## Security Best Practices

1. **Rotate tokens regularly** - Generate a new token every 3-6 months
2. **Never commit tokens** - Use GitHub Secrets, never hardcode
3. **Monitor logs** - Review workflow logs for suspicious activity
4. **Limit permissions** - The cron token should only have access to `/api/seo/cron`
5. **Use HTTPS only** - Ensure your Render URL uses HTTPS

## Next Steps

- [ ] Generate a secure token
- [ ] Add GitHub Secrets
- [ ] Add environment variable to Render
- [ ] Update `/api/seo/cron` to check token
- [ ] Test the workflow manually
- [ ] Verify daily runs in GitHub Actions
- [ ] Monitor first few runs in Render logs

For questions or issues, check the main [HANDOFF.md](HANDOFF.md) document.
