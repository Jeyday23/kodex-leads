# Database Migrations Status

## Overview

Kodex uses Supabase for PostgreSQL database management with versioned migrations.

## Current Migrations

| Migration | Status | Purpose |
|-----------|--------|---------|
| 010_seo_engine.sql | ✅ Applied | Core SEO tables (topics, content, leads) |
| 011_authority_engine.sql | ✅ Applied | Authority source management |
| 012_authority_operational_modules.sql | ✅ Applied | Editorial and knowledge management |
| 013_opportunity_intelligence_completion.sql | ✅ Applied | Opportunity discovery and analysis |
| 014_autonomous_ranking_engine.sql | ⏳ Pending | Content automation and ranking |

## Migration Details

### 014_autonomous_ranking_engine.sql
The latest migration adds:

**New Types:**
- `authority_autopilot_mode` - Automation control (off, draft_only, guarded, controlled)
- `authority_asset_status` - Content lifecycle states
- `authority_claim_category` - Claim categorization
- `authority_verification_result` - Verification states

**New Tables:**
- `authority_automation_settings` - Global autopilot configuration
- `authority_content_assets` - Content pieces and metadata
- `authority_content_versions` - Version history for content
- `authority_content_claims` - Claims extracted from content
- (More tables in the full migration)

## Applying Migrations

### Option 1: Using Supabase Dashboard (Easiest)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Create a new query
5. Copy the contents of `supabase/migrations/014_autonomous_ranking_engine.sql`
6. Run the query

### Option 2: Using Supabase CLI (Recommended)

```bash
# Start local Supabase (requires Docker)
supabase start

# Push migrations to local environment
supabase db push

# Push to production (requires authentication)
supabase db push --linked
```

### Option 3: Manual SQL Execution

Connect to your Supabase database with a PostgreSQL client and execute the migration SQL.

## Verifying Migrations

After applying, verify the tables exist:

```sql
-- Check if new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'authority_%';

-- Should show:
-- authority_automation_settings
-- authority_content_assets
-- authority_content_versions
-- authority_content_claims
-- ... (more tables)
```

Or via CLI:
```bash
supabase status
```

## Local Development

To test migrations locally:

1. **Install Docker** - Required for local Supabase
2. **Start Supabase:**
   ```bash
   supabase start
   ```
3. **Apply migrations:**
   ```bash
   supabase db push
   ```
4. **Verify:**
   ```bash
   supabase status
   ```

## Production Deployment

Migrations are automatically applied in production through:

1. **Manual application** via Supabase Dashboard (safest)
2. **CLI push** with `--linked` flag (requires auth)
3. **Scheduled maintenance** window (if set up)

## Rollback

To rollback a migration:

```bash
# List migration history
supabase migration list

# Rollback last migration (if supported)
supabase db reset
```

**Note:** Not all migrations are reversible. Always backup production before applying new migrations.

## Next Steps

- [ ] Apply 014_autonomous_ranking_engine.sql to production
- [ ] Verify tables created in Supabase dashboard
- [ ] Test dashboard queries work with new schema
- [ ] Monitor Render logs for any database errors

## Troubleshooting

### Migration fails
- Check Supabase logs in dashboard
- Verify no conflicting table names
- Ensure proper permissions in Supabase

### Tables don't appear
- Wait 30-60 seconds for commit to finish
- Refresh browser
- Check "All Schemas" dropdown in Supabase

### Local Supabase issues
- Restart Docker: `docker restart supabase_db`
- Reset database: `supabase db reset`
- Check logs: `supabase logs --follow`

## For More Info

- [Supabase Migrations Docs](https://supabase.com/docs/guides/database/migrations)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- See [HANDOFF.md](HANDOFF.md) for overall project documentation
