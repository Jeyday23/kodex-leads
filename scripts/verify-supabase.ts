/**
 * Verifies that Supabase migrations 010-020 are applied and that the
 * privileged server client can actually read the tables the app depends on.
 *
 * Run with the production/staging server environment loaded:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx tsx scripts/verify-supabase.ts
 *
 * Exits non-zero when anything required is missing, so it can gate a release.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

/** Tables created by each migration, used to report which migration is missing. */
const MIGRATION_TABLES: Record<string, string[]> = {
  "010_seo_engine": [
    "content_links", "content_pages", "content_sources", "leads",
    "seo_audit_events", "seo_metrics", "seo_topics", "source_documents",
  ],
  "011_authority_engine": [
    "audit_logs", "brand_mentions", "citation_urls", "citations",
    "competitor_mentions", "competitors", "job_failures", "monitoring_projects",
    "monitoring_prompts", "monitoring_runs", "organizations", "profiles",
    "provider_responses", "providers", "scheduled_jobs", "visibility_scores",
  ],
  "012_authority_operational_modules": [
    "authority_discovery_run_items", "authority_discovery_runs",
    "authority_editorial_assignments", "authority_editorial_briefs",
    "authority_editorial_items", "authority_editorial_reviews",
    "authority_editorial_revisions", "authority_editorial_sources",
    "authority_idempotency_keys", "authority_keyword_metrics",
    "authority_knowledge_links", "authority_knowledge_obligations",
    "authority_knowledge_reviews", "authority_knowledge_sources",
    "authority_knowledge_versions", "authority_notifications",
    "authority_opportunities", "authority_opportunity_decisions",
    "authority_opportunity_duplicates", "authority_opportunity_sources",
  ],
  "014_autonomous_ranking_engine": [
    "authority_approval_policies", "authority_approval_requests",
    "authority_automation_settings", "authority_claim_sources",
    "authority_content_assets", "authority_content_claims",
    "authority_content_experiments", "authority_content_versions",
    "authority_conversion_metrics", "authority_internal_links",
    "authority_llm_asset_metrics", "authority_outreach_opportunities",
    "authority_page_audits", "authority_publication_events",
    "authority_publication_jobs", "authority_quality_gate_results",
    "authority_quality_gate_runs", "authority_revision_events",
    "authority_revision_plans", "authority_search_metrics",
  ],
  "018_regulatory_trigger_leads": ["discovered_leads"],
  "020_media_jobs": ["media_jobs"],
};

/** Columns added by the leads repair migrations, which create no new tables. */
const COLUMN_CHECKS: { migration: string; table: string; columns: string[] }[] = [
  { migration: "015_leads_schema_repair", table: "leads", columns: ["company_name", "lead_score", "lead_grade", "recommended_action"] },
  { migration: "016_legacy_leads_company_compat", table: "leads", columns: ["company"] },
  { migration: "019_discovered_lead_dedupe", table: "discovered_leads", columns: ["lead_key"] },
];

const ADMIN_ROLES = ["admin", "administrator", "owner", "founder"];
const REQUEST_TIMEOUT_MS = 15_000;
const CHECK_CONCURRENCY = 8;

type Failure = { migration: string; detail: string };

export function loadLocalEnvFile(path = ".env.local", env: NodeJS.ProcessEnv = process.env): void {
  const fullPath = resolve(process.cwd(), path);
  if (!existsSync(fullPath)) return;

  const lines = readFileSync(fullPath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (env[key] !== undefined) continue;
    env[key] = parseEnvValue(rawValue);
  }
}

export function createSupabaseVerifierClient(url: string, serviceKey: string, fetchImpl: typeof fetch = fetch) {
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
    global: {
      fetch: createSupabaseVerifierFetch(serviceKey, fetchImpl),
    },
  });
}

export function createSupabaseVerifierFetch(
  serviceKey: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = REQUEST_TIMEOUT_MS,
): typeof fetch {
  const shouldRemoveSecretBearer = serviceKey.startsWith("sb_secret_");

  return async (input, init = {}) => {
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    const initHeaders = new Headers(init.headers);
    initHeaders.forEach((value, key) => headers.set(key, value));

    if (shouldRemoveSecretBearer && headers.get("Authorization") === `Bearer ${serviceKey}`) {
      headers.delete("Authorization");
    }

    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort(new Error(`Supabase verifier request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    const cleanup = attachAbortForwarding(controller, [input instanceof Request ? input.signal : null, init.signal]);

    try {
      return await fetchImpl(input, { ...init, headers, signal: controller.signal });
    } catch (error) {
      if (timedOut) {
        throw new Error(`Supabase verifier request timed out after ${timeoutMs}ms`);
      }
      throw new Error(`Supabase verifier fetch failed: ${errorName(error)}${errorMessage(error)}`);
    } finally {
      clearTimeout(timeout);
      cleanup();
    }
  };
}

async function main() {
  loadLocalEnvFile();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  const missingEnv = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !serviceKey && "SUPABASE_SERVICE_ROLE_KEY",
  ].filter(Boolean);

  if (missingEnv.length > 0) {
    console.error(`FAIL  Missing environment: ${missingEnv.join(", ")}`);
    console.error("      The Authority tables use row level security that admits only");
    console.error("      service_role or an admin profile. The anon key cannot read them.");
    process.exit(1);
  }
  if (!isValidHeaderValue(serviceKey!)) {
    console.error("FAIL  SUPABASE_SERVICE_ROLE_KEY contains characters that cannot be sent in an HTTP header.");
    console.error("      Re-copy the key into .env.local as a single line with no hidden newline or carriage-return characters.");
    process.exit(1);
  }

  const supabase = createSupabaseVerifierClient(url!, serviceKey!);
  const failures: Failure[] = [];
  const checks: Array<() => Promise<void>> = [];
  let adminCount = 0;

  for (const [migration, tables] of Object.entries(MIGRATION_TABLES)) {
    for (const table of tables) {
      checks.push(async () => {
        const { error } = await supabase.from(table).select("*", { count: "exact", head: true }).limit(1);
        if (error) failures.push({ migration, detail: `${table}: ${formatSupabaseError(error)}` });
      });
    }
  }

  for (const { migration, table, columns } of COLUMN_CHECKS) {
    checks.push(async () => {
      const { error } = await supabase.from(table).select(columns.join(",")).limit(1);
      if (error) failures.push({ migration, detail: `${table}(${columns.join(", ")}): ${formatSupabaseError(error)}` });
    });
  }

  checks.push(async () => {
    const { data: settings, error: settingsError } = await supabase
      .from("authority_automation_settings")
      .select("id,mode")
      .eq("id", "global")
      .maybeSingle();
    if (settingsError) {
      failures.push({ migration: "014_autonomous_ranking_engine", detail: `authority_automation_settings global row: ${formatSupabaseError(settingsError)}` });
    } else if (!settings) {
      failures.push({ migration: "014_autonomous_ranking_engine", detail: "authority_automation_settings has no 'global' row (the seed insert did not run)" });
    }
  });

  checks.push(async () => {
    const { data, error: adminError } = await supabase
      .from("profiles")
      .select("id,email,role")
      .in("role", ADMIN_ROLES);
    if (adminError) {
      failures.push({ migration: "011_authority_engine", detail: `profiles: ${formatSupabaseError(adminError)}` });
    } else if (!data || data.length === 0) {
      failures.push({
        migration: "011_authority_engine",
        detail: `no profiles row has an admin role (${ADMIN_ROLES.join("/")}). Nobody can access /admin/*.`,
      });
    } else {
      adminCount = data.length;
    }
  });

  await runWithConcurrency(checks, CHECK_CONCURRENCY);

  console.log(`Checked ${checks.length} objects across migrations 010-020.`);

  if (failures.length === 0) {
    console.log("PASS  Supabase is ready.");
    if (adminCount > 0) console.log(`      ${adminCount} administrator profile(s) present.`);
    return;
  }

  const byMigration = new Map<string, string[]>();
  for (const { migration, detail } of failures) {
    byMigration.set(migration, [...(byMigration.get(migration) ?? []), detail]);
  }

  console.error(`FAIL  ${failures.length} problem(s):`);
  for (const [migration, details] of [...byMigration].sort()) {
    console.error(`\n  ${migration}`);
    for (const detail of details) console.error(`    - ${detail}`);
  }
  console.error("\nApply the migrations in order (010 -> 020) from supabase/migrations/, then re-run.");
  process.exit(1);
}

function parseEnvValue(rawValue: string): string {
  let value = rawValue.trim();
  const comment = value.match(/(^|[^\\])#/);
  if (comment && !value.startsWith("\"") && !value.startsWith("'")) value = value.slice(0, comment.index).trim();
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return value.replace(/\\n/g, "\n");
}

export function isValidHeaderValue(value: string): boolean {
  try {
    new Headers({ apikey: value });
    return /^[\t\x20-\x7e\x80-\xff]*$/.test(value);
  } catch {
    return false;
  }
}

function attachAbortForwarding(controller: AbortController, signals: Array<AbortSignal | null | undefined>): () => void {
  const cleanups: Array<() => void> = [];
  for (const signal of signals) {
    if (!signal) continue;
    if (signal.aborted) {
      controller.abort(signal.reason);
      continue;
    }
    const onAbort = () => controller.abort(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    cleanups.push(() => signal.removeEventListener("abort", onAbort));
  }
  return () => cleanups.forEach((cleanup) => cleanup());
}

async function runWithConcurrency(tasks: Array<() => Promise<void>>, concurrency: number): Promise<void> {
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
    while (index < tasks.length) {
      const task = tasks[index];
      index += 1;
      await task();
    }
  });
  await Promise.all(workers);
}

function formatSupabaseError(error: unknown): string {
  const record = typeof error === "object" && error !== null ? error as Record<string, unknown> : {};
  const parts: string[] = [];
  const status = record.status ?? record.statusCode;
  if (typeof status === "number" || typeof status === "string") parts.push(`HTTP ${status}`);
  const code = record.code;
  if (typeof code === "string" && code) parts.push(`code ${code}`);
  const name = errorName(error);
  const message = errorMessage(error);
  if (name || message) parts.push(`${name}${message}`);
  return parts.length > 0 ? parts.join("; ") : "unknown Supabase error";
}

function errorName(error: unknown): string {
  return error instanceof Error && error.name ? error.name : "Error";
}

function errorMessage(error: unknown): string {
  const cause = typeof error === "object" && error !== null ? (error as { cause?: unknown }).cause : undefined;
  const causeDetails = formatErrorCause(cause);
  if (error instanceof Error && error.message) return `: ${error.message}${causeDetails}`;
  if (typeof error === "object" && error !== null && typeof (error as { message?: unknown }).message === "string") {
    return `: ${(error as { message: string }).message}${causeDetails}`;
  }
  if (typeof error === "string" && error) return `: ${error}`;
  if (causeDetails) return `: ${causeDetails}`;
  return "";
}

function formatErrorCause(cause: unknown): string {
  if (typeof cause !== "object" || cause === null) return "";
  const record = cause as Record<string, unknown>;
  const parts = [
    typeof record.name === "string" && record.name ? `cause ${record.name}` : null,
    typeof record.code === "string" && record.code ? `code ${record.code}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? ` (${parts.join(", ")})` : "";
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error("FAIL  Verification could not complete:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
