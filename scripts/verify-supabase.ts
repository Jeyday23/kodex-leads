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

type Failure = { migration: string; detail: string };

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

  const supabase = createClient(url!, serviceKey!, { auth: { persistSession: false } });
  const failures: Failure[] = [];
  let checked = 0;

  for (const [migration, tables] of Object.entries(MIGRATION_TABLES)) {
    for (const table of tables) {
      checked += 1;
      const { error } = await supabase.from(table).select("*", { count: "exact", head: true }).limit(1);
      if (error) failures.push({ migration, detail: `${table}: ${error.message}` });
    }
  }

  for (const { migration, table, columns } of COLUMN_CHECKS) {
    checked += 1;
    const { error } = await supabase.from(table).select(columns.join(",")).limit(1);
    if (error) failures.push({ migration, detail: `${table}(${columns.join(", ")}): ${error.message}` });
  }

  // The single row the Authority Engine reads on every dashboard load.
  checked += 1;
  const { data: settings, error: settingsError } = await supabase
    .from("authority_automation_settings")
    .select("id,mode")
    .eq("id", "global")
    .maybeSingle();
  if (settingsError) {
    failures.push({ migration: "014_autonomous_ranking_engine", detail: `authority_automation_settings global row: ${settingsError.message}` });
  } else if (!settings) {
    failures.push({ migration: "014_autonomous_ranking_engine", detail: "authority_automation_settings has no 'global' row (the seed insert did not run)" });
  }

  // At least one founder/admin profile must exist or nobody can sign in to admin.
  checked += 1;
  const { data: admins, error: adminError } = await supabase
    .from("profiles")
    .select("id,email,role")
    .in("role", ADMIN_ROLES);
  if (adminError) {
    failures.push({ migration: "011_authority_engine", detail: `profiles: ${adminError.message}` });
  } else if (!admins || admins.length === 0) {
    failures.push({
      migration: "011_authority_engine",
      detail: `no profiles row has an admin role (${ADMIN_ROLES.join("/")}). Nobody can access /admin/*.`,
    });
  }

  console.log(`Checked ${checked} objects across migrations 010-020.`);

  if (failures.length === 0) {
    console.log("PASS  Supabase is ready.");
    if (admins) console.log(`      ${admins.length} administrator profile(s) present.`);
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

main().catch((error) => {
  console.error("FAIL  Verification could not complete:", error instanceof Error ? error.message : error);
  process.exit(1);
});
