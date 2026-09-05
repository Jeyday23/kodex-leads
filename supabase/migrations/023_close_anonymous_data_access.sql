-- Close anonymous read/write access to lead and content data.
--
-- Found by the Supabase security advisor against the live production project
-- on 2026-09-05, reported at level ERROR, facing EXTERNAL:
--
--   "Table public.leads is public, but RLS has not been enabled."
--
-- and the same for eight more tables. RLS is not on by default for tables
-- created with plain SQL, and migrations 010-020 created these without it, so
-- they have been exposed since creation.
--
-- What that means in practice. NEXT_PUBLIC_SUPABASE_ANON_KEY ships inside the
-- browser bundle; it is public by design. PostgREST exposes every table in the
-- `public` schema. With RLS off, anyone who opens devtools on the marketing
-- site can read and write all nine tables directly, including discovered_leads
-- and leads, which hold company names, contact emails and outreach drafts.
--
-- The fix is deny-all, not a policy set. Every application read and write of
-- these tables goes through getSeoSupabase() in lib/seo/db.ts, which builds its
-- client from SUPABASE_SERVICE_ROLE_KEY. The service role bypasses RLS
-- entirely, so enabling RLS with no policy changes nothing for the app and
-- removes anon and authenticated access completely. Verified before writing
-- this: no client component queries any of these tables (the string "leads" in
-- app/components/Features.tsx is a section id in marketing copy, not a query).
--
-- This is deliberately narrower than multi-tenant RLS. It is a single-operator
-- system; the requirement is that anonymous users cannot read or modify lead
-- data, which is exactly what deny-all achieves. Per-user policies can be added
-- later without undoing any of this.
--
-- Reversible: `alter table <t> disable row level security;`

do $$
declare
  target text;
begin
  foreach target in array array[
    'leads',
    'discovered_leads',
    'content_pages',
    'content_sources',
    'content_links',
    'seo_topics',
    'source_documents',
    'seo_metrics',
    'seo_audit_events'
  ]
  loop
    -- to_regclass returns null rather than raising when the table is absent, so
    -- this migration is safe to run against a project missing an older table.
    if to_regclass(format('public.%I', target)) is not null then
      execute format('alter table public.%I enable row level security', target);
      -- Deliberately NOT `force row level security`. Force would apply RLS to
      -- the table owner as well, which would also subject any SECURITY DEFINER
      -- function owned by postgres to these (nonexistent) policies. The owner
      -- is not reachable through PostgREST, so forcing buys nothing here and
      -- risks breaking something that currently works.
      raise notice 'RLS enabled on public.%', target;
    else
      raise notice 'skipped public.%: table not present', target;
    end if;
  end loop;
end
$$;
