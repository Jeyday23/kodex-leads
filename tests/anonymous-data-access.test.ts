import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Migration 023 closes anonymous access to the lead and content tables.
 *
 * This was demonstrated against the live production project on 2026-09-05,
 * not merely reported by the advisor. Using NEXT_PUBLIC_SUPABASE_ANON_KEY,
 * the key that ships inside the browser bundle:
 *
 *   GET /rest/v1/seo_topics             -> 200, 3 rows, all 12 columns
 *   GET /rest/v1/authority_notifications -> 200, 0 rows
 *
 * Same key, same shape of request. seo_topics had RLS off;
 * authority_notifications had RLS on with no policies. The only difference
 * was RLS, which is what makes deny-all the correct fix.
 */

const root = process.cwd();
const migrationsDir = join(root, "supabase/migrations");
const MIGRATION = "023_close_anonymous_data_access.sql";

const EXPOSED_TABLES = [
  "leads",
  "discovered_leads",
  "content_pages",
  "content_sources",
  "content_links",
  "seo_topics",
  "source_documents",
  "seo_metrics",
  "seo_audit_events",
];

function migrationSql(): string {
  return readFileSync(join(migrationsDir, MIGRATION), "utf8");
}

test("a migration exists to close anonymous data access", () => {
  assert.ok(migrationSql().length > 0, `${MIGRATION} is missing`);
});

test("every table the advisor flagged is covered", () => {
  const sql = migrationSql();
  for (const table of EXPOSED_TABLES) {
    assert.match(sql, new RegExp(`'${table}'`), `${table} is not in the migration`);
  }
  assert.match(sql, /enable row level security/i);
});

test("the migration is idempotent and tolerates a missing table", () => {
  const sql = migrationSql();
  // to_regclass returns null instead of raising, so re-running against a
  // project that predates one of these tables is safe.
  assert.match(sql, /to_regclass/);
  // enable is idempotent in Postgres; a second run is a no-op rather than an error.
  assert.doesNotMatch(sql, /drop table/i);
  assert.doesNotMatch(sql, /delete from/i);
});

test("no policy is created: the app reads these tables with the service role", () => {
  const sql = migrationSql();
  // service_role bypasses RLS, so deny-all changes nothing for the application
  // and removes anon access completely. A permissive policy would reopen it.
  assert.doesNotMatch(sql, /create policy/i);
});

test("the application really does use the service role for these tables", () => {
  // If this ever changes to the anon key, deny-all would break the app and
  // this test is where that shows up.
  const db = readFileSync(join(root, "lib/seo/db.ts"), "utf8");
  assert.match(db, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(db, /NEXT_PUBLIC_SUPABASE_ANON_KEY/);
});
