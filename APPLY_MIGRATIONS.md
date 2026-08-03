# How to Apply All Database Migrations

The migrations must be applied **in order** (010 → 011 → 012 → 013 → 014).

## Quick Fix: Apply All Migrations via Supabase Dashboard

### Step 1: Go to Supabase SQL Editor
1. Open https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** → **New Query**

### Step 2: Apply Each Migration in Order

For **each** migration file below, copy its contents into a new SQL query and run:

#### Migration 010: SEO Engine
File: `supabase/migrations/010_seo_engine.sql`
```
Copy → Paste → Run
```

#### Migration 011: Authority Engine
File: `supabase/migrations/011_authority_engine.sql`
```
Copy → Paste → Run
```

#### Migration 012: Authority Operational Modules
File: `supabase/migrations/012_authority_operational_modules.sql`
```
Copy → Paste → Run
⚠️ Creates authority_opportunities table (required for 014)
```

#### Migration 013: Opportunity Intelligence
File: `supabase/migrations/013_opportunity_intelligence_completion.sql`
```
Copy → Paste → Run
```

#### Migration 014: Autonomous Ranking Engine
File: `supabase/migrations/014_autonomous_ranking_engine.sql`
```
Copy → Paste → Run
```

## Why You Got the Error

```
ERROR 42P01: relation "authority_opportunities" does not exist
```

This happened because:
1. Migration 014 tried to run first
2. It references `authority_opportunities` from migration 012
3. Migration 012 hadn't been applied yet

**Solution:** Apply all previous migrations first (010-013) before 014.

## Verify All Tables Exist

After applying all migrations, run this query to verify:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'authority_%'
OR table_name LIKE 'seo_%'
OR table_name LIKE 'leads'
ORDER BY table_name;
```

Should return ~40+ tables across all migrations.

## If Migrations Already Partially Applied

Check what's already in your database:

```sql
-- See all tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Then apply only the missing migrations.

## Scripts Included

Helper scripts to extract individual migrations:

```bash
# Extract just migration 014 (for reference)
sed -n '1,/^create table if not exists/p' supabase/migrations/014_autonomous_ranking_engine.sql
```

## Automation: Apply All at Once

If you want to apply all 5 migrations at once, combine them:

```bash
# This creates one combined SQL file
cat supabase/migrations/010_seo_engine.sql \
    supabase/migrations/011_authority_engine.sql \
    supabase/migrations/012_authority_operational_modules.sql \
    supabase/migrations/013_opportunity_intelligence_completion.sql \
    supabase/migrations/014_autonomous_ranking_engine.sql > /tmp/all_migrations.sql
```

Then paste `/tmp/all_migrations.sql` contents into Supabase SQL Editor and run once.

⚠️ **Recommended:** Apply one at a time and verify each succeeds before moving to the next.

## Troubleshooting

### Still getting "relation does not exist"
- Verify previous migration ran successfully
- Check for error messages in Supabase logs
- Try running from fresh browser tab (clear cache)
- Wait 30 seconds between migrations

### Duplicate table error
- Some migrations use `if not exists` - safe to re-run
- If you get "already exists" error, that table was already applied

### Slow performance during migration
- Large migrations take time
- Supabase dashboard may appear to hang
- Check the query status at the bottom
- Don't close the tab while running

## Next Steps

- [ ] Apply migration 010
- [ ] Apply migration 011  
- [ ] Apply migration 012
- [ ] Apply migration 013
- [ ] Apply migration 014
- [ ] Run verification query
- [ ] Confirm all ~40+ tables exist

After all migrations are applied, your database will have:
- SEO engine infrastructure
- Authority source management
- Editorial workflow tables
- Opportunity intelligence
- Autonomous ranking system

Ready for full production use! 🚀
