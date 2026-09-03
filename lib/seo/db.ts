// Intentionally NOT marked "server-only": this module is shared with the Render
// cron jobs and workers in scripts/ and workers/, which run under plain tsx.
// The "server-only" package throws outside a React Server Component bundler, so
// importing it here breaks every scheduled job. Client leakage is prevented
// instead by never reading a NEXT_PUBLIC_ credential here, and asserted by
// tests/server-module-boundaries.test.ts.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type SeoSupabaseState =
  | { ok: true }
  | { ok: false; reason: string; missing: string[] };

/**
 * Privileged server-side Supabase client.
 *
 * The Authority tables enable row level security with policies that admit only
 * `service_role` or an authenticated admin profile (migration 014). A
 * background job or server route holds neither, so it MUST use the service role
 * key. Falling back to the anon key here silently produced empty reads that
 * looked like a broken or missing table — most visibly
 * `authority_automation_settings` reporting "could not be read".
 */
export function getSeoSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Explains why the privileged client is unavailable, so operators see the
 * missing variable rather than a downstream symptom.
 */
export function getSeoSupabaseState(): SeoSupabaseState {
  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length === 0) return { ok: true };
  return {
    ok: false,
    reason: `Supabase server access is not configured. Set ${missing.join(" and ")} in the environment.`,
    missing,
  };
}
