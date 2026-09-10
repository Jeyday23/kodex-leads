// Orchestrates every WS2 audit kind for one URL and stores one row per kind
// in growth_site_audits (two rows for "lighthouse": mobile and desktop).
// Storage is skipped cleanly - never thrown - when Supabase is not
// configured, and the summary says so honestly rather than pretending the
// run was persisted.

import { getSeoSupabase } from "@/lib/seo/db";
import { runPagespeedBothStrategies, type PsiRunResult } from "./pagespeed";
import { runTechnicalAudit, type TechnicalAuditResult } from "./technical";
import { evaluateGeoChecklist, type GeoCheckResult } from "./geo-checklist";
import { fetchSiteFiles, type SiteFilesBundle } from "./site-files";

export interface AuditIssue {
  id: string;
  severity: "high" | "medium" | "low";
  message: string;
  fix: string;
}

export interface RunAuditSummary {
  url: string;
  measuredAt: string;
  storage: { attempted: boolean; stored: boolean; detail: string };
  lighthouse: { mobile: PsiRunResult; desktop: PsiRunResult };
  technical: TechnicalAuditResult;
  geo: GeoCheckResult[];
  siteFiles: SiteFilesBundle;
  issues: AuditIssue[];
}

const RENDER_BLOCKING_SCRIPT_PENALTY = 8;
const HEAD_STYLESHEET_PENALTY = 6;
const NOT_CACHEABLE_PENALTY = 25;
const BAD_STATUS_PENALTY = 100;
const FETCH_TIMEOUT_MS = 15_000;

function technicalScore(result: TechnicalAuditResult): number | null {
  if (result.status === "failed") return null;
  if (!result.httpStatus || result.httpStatus >= 400) return 0;

  let score = 100;
  score -= Math.min(result.renderBlocking.blockingScriptCount, 5) * RENDER_BLOCKING_SCRIPT_PENALTY;
  score -= Math.min(result.renderBlocking.headStylesheetCount, 4) * HEAD_STYLESHEET_PENALTY;
  if (!result.cacheability.cacheable) score -= NOT_CACHEABLE_PENALTY;
  return Math.max(0, Math.min(100, score));
}

function geoScore(checks: GeoCheckResult[]): number {
  if (checks.length === 0) return 0;
  const passing = checks.filter((check) => check.status === "pass").length;
  return Math.round((passing / checks.length) * 100);
}

function siteFilesScore(siteFiles: SiteFilesBundle): number {
  const flags = [siteFiles.robotsTxt.present, siteFiles.llmsTxt.present, siteFiles.sitemapXml.present];
  return Math.round((flags.filter(Boolean).length / flags.length) * 100);
}

function buildIssues(technical: TechnicalAuditResult, geo: GeoCheckResult[], siteFiles: SiteFilesBundle): AuditIssue[] {
  const issues: AuditIssue[] = [];

  if (technical.status === "failed") {
    issues.push({ id: "technical_fetch_failed", severity: "high", message: technical.detail ?? "Technical audit failed.", fix: "Confirm the site is reachable and re-run the audit." });
  } else {
    if (technical.httpStatus && technical.httpStatus >= 400) {
      issues.push({ id: "technical_bad_status", severity: "high", message: `Page responded with HTTP ${technical.httpStatus}.`, fix: "Fix the server error or redirect so the page returns HTTP 200." });
    }
    if (!technical.cacheability.cacheable) {
      issues.push({ id: "technical_not_cacheable", severity: "medium", message: "Response has no effective caching directive.", fix: "Set Cache-Control (max-age, public) or an ETag/Last-Modified validator." });
    }
    if (technical.renderBlocking.blockingScriptCount > 0) {
      issues.push({ id: "technical_render_blocking_scripts", severity: "medium", message: `${technical.renderBlocking.blockingScriptCount} render-blocking script(s) found.`, fix: "Add async or defer, or convert to type=\"module\", on non-critical scripts." });
    }
    if (technical.renderBlocking.headStylesheetCount > 2) {
      issues.push({ id: "technical_head_stylesheets", severity: "low", message: `${technical.renderBlocking.headStylesheetCount} stylesheet links in <head>.`, fix: "Inline critical CSS and defer non-critical stylesheets." });
    }
  }

  for (const check of geo) {
    if (check.status === "fix") {
      issues.push({ id: `geo_${check.id}`, severity: "medium", message: `${check.label}: ${check.detail}`, fix: check.fix });
    }
  }

  if (!siteFiles.robotsTxt.present) issues.push({ id: "site_files_robots", severity: "low", message: "robots.txt is missing or unreachable.", fix: "Publish a robots.txt at the site root." });
  if (!siteFiles.sitemapXml.present) issues.push({ id: "site_files_sitemap", severity: "low", message: "sitemap.xml is missing or unreachable.", fix: "Publish a sitemap.xml at the site root." });

  return issues;
}

async function fetchPageHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { method: "GET", signal: controller.signal, redirect: "follow" });
    return await response.text();
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

interface StoreRowInput {
  url: string;
  kind: "lighthouse" | "technical" | "geo" | "site_files";
  device: "mobile" | "desktop" | null;
  score: number | null;
  payload: unknown;
  issues: AuditIssue[];
  measuredAt: string;
}

async function storeRow(row: StoreRowInput): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const { error } = await supabase.from("growth_site_audits").insert({
    url: row.url,
    kind: row.kind,
    device: row.device,
    score: row.score,
    payload: row.payload as Record<string, unknown>,
    issues: row.issues,
    measured_at: row.measuredAt,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Runs every audit kind for one URL and stores one row per kind (two rows
 * for lighthouse: mobile and desktop). Storage failures - including no
 * Supabase configured - never throw; they are reflected honestly in
 * `summary.storage`.
 */
export async function runSiteAudit(url: string): Promise<RunAuditSummary> {
  const measuredAt = new Date().toISOString();

  const [lighthouse, technical, siteFiles, html] = await Promise.all([
    runPagespeedBothStrategies(url),
    runTechnicalAudit(url),
    fetchSiteFiles(url),
    fetchPageHtml(url),
  ]);

  const geo = evaluateGeoChecklist(html, siteFiles);
  const issues = buildIssues(technical, geo, siteFiles);

  const supabaseConfigured = getSeoSupabase() !== null;
  let stored = 0;
  let storageError: string | null = null;

  if (supabaseConfigured) {
    const rows: StoreRowInput[] = [
      { url, kind: "lighthouse", device: "mobile", score: lighthouse.mobile.categories.performance, payload: lighthouse.mobile, issues: [], measuredAt },
      { url, kind: "lighthouse", device: "desktop", score: lighthouse.desktop.categories.performance, payload: lighthouse.desktop, issues: [], measuredAt },
      { url, kind: "technical", device: null, score: technicalScore(technical), payload: technical, issues: issues.filter((issue) => issue.id.startsWith("technical_")), measuredAt },
      { url, kind: "geo", device: null, score: geoScore(geo), payload: { checks: geo }, issues: issues.filter((issue) => issue.id.startsWith("geo_")), measuredAt },
      { url, kind: "site_files", device: null, score: siteFilesScore(siteFiles), payload: siteFiles, issues: issues.filter((issue) => issue.id.startsWith("site_files_")), measuredAt },
    ];

    for (const row of rows) {
      const result = await storeRow(row);
      if (result.ok) stored += 1;
      else storageError = storageError ?? result.error ?? "Unknown storage error.";
    }
  }

  const storage = supabaseConfigured
    ? storageError
      ? { attempted: true, stored: stored > 0, detail: `Stored ${stored}/5 audit rows; first error: ${storageError}` }
      : { attempted: true, stored: true, detail: `Stored ${stored}/5 audit rows.` }
    : { attempted: false, stored: false, detail: "Supabase is not configured; results are not persisted." };

  return { url, measuredAt, storage, lighthouse, technical, geo, siteFiles, issues };
}
