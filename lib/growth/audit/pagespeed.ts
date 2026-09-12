// PageSpeed Insights v5 client for the Growth Engine site-audit module (WS2).
//
// PAGESPEED_API_KEY is optional: Google's PSI API works unauthenticated at a
// lower quota, so the key is appended to the query string only when present.
// This module must never throw a network or parsing failure past its public
// functions - a failed fetch or a non-OK response always resolves to a
// `status: "failed"` result with a human-readable `detail`, because it runs
// from the site-audit route, the admin UI, and scripts/run-growth-site-audit.ts
// under plain tsx (no "server-only").

export type PsiStrategy = "mobile" | "desktop";

export type PsiMetricId = "lcp" | "fcp" | "tbt" | "cls";

export interface PsiMetricResult {
  id: PsiMetricId;
  label: string;
  value: number | null;
  unit: "ms" | "unitless";
  displayValue: string | null;
  pass: boolean | null;
  threshold: number;
}

export interface PsiCategoryScores {
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
}

export type PsiRunStatus = "generated" | "failed";

export interface PsiRunResult {
  status: PsiRunStatus;
  strategy: PsiStrategy;
  url: string;
  categories: PsiCategoryScores;
  metrics: PsiMetricResult[];
  detail?: string;
}

/**
 * Core Web Vitals "good" thresholds (Google's published field-data
 * boundaries). TBT is a lab-only proxy for INP with its own Lighthouse
 * threshold. Declared as named constants so pass/fail logic and any future
 * threshold change stay in one place.
 */
export const CWV_THRESHOLDS = {
  lcpMs: 2500,
  fcpMs: 1800,
  tbtMs: 200,
  cls: 0.1,
} as const;

const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"] as const;

function buildUrl(targetUrl: string, strategy: PsiStrategy): string {
  const params = new URLSearchParams({ url: targetUrl, strategy });
  for (const category of CATEGORIES) params.append("category", category);
  const key = process.env.PAGESPEED_API_KEY;
  if (key) params.set("key", key);
  return `${PSI_ENDPOINT}?${params.toString()}`;
}

function scoreOf(psi: unknown, categoryId: string): number | null {
  const categories = (psi as { lighthouseResult?: { categories?: Record<string, { score?: number | null }> } })
    ?.lighthouseResult?.categories;
  const raw = categories?.[categoryId]?.score;
  if (typeof raw !== "number") return null;
  return Math.round(raw * 100);
}

function auditNumericValue(psi: unknown, auditId: string): { numericValue: number | null; displayValue: string | null } {
  const audits = (psi as { lighthouseResult?: { audits?: Record<string, { numericValue?: number; displayValue?: string }> } })
    ?.lighthouseResult?.audits;
  const audit = audits?.[auditId];
  return {
    numericValue: typeof audit?.numericValue === "number" ? audit.numericValue : null,
    displayValue: typeof audit?.displayValue === "string" ? audit.displayValue : null,
  };
}

/**
 * Maps a raw PSI v5 response into the typed result shape. Exported
 * separately from the network call so tests can exercise it against a fixture
 * with no network access.
 */
export function mapPsiResponse(psi: unknown, strategy: PsiStrategy, url: string): PsiRunResult {
  const categories: PsiCategoryScores = {
    performance: scoreOf(psi, "performance"),
    accessibility: scoreOf(psi, "accessibility"),
    bestPractices: scoreOf(psi, "best-practices"),
    seo: scoreOf(psi, "seo"),
  };

  const lcp = auditNumericValue(psi, "largest-contentful-paint");
  const fcp = auditNumericValue(psi, "first-contentful-paint");
  const tbt = auditNumericValue(psi, "total-blocking-time");
  const cls = auditNumericValue(psi, "cumulative-layout-shift");

  const metrics: PsiMetricResult[] = [
    {
      id: "lcp",
      label: "Largest Contentful Paint",
      value: lcp.numericValue,
      unit: "ms",
      displayValue: lcp.displayValue,
      pass: lcp.numericValue === null ? null : lcp.numericValue <= CWV_THRESHOLDS.lcpMs,
      threshold: CWV_THRESHOLDS.lcpMs,
    },
    {
      id: "fcp",
      label: "First Contentful Paint",
      value: fcp.numericValue,
      unit: "ms",
      displayValue: fcp.displayValue,
      pass: fcp.numericValue === null ? null : fcp.numericValue <= CWV_THRESHOLDS.fcpMs,
      threshold: CWV_THRESHOLDS.fcpMs,
    },
    {
      id: "tbt",
      label: "Total Blocking Time",
      value: tbt.numericValue,
      unit: "ms",
      displayValue: tbt.displayValue,
      pass: tbt.numericValue === null ? null : tbt.numericValue <= CWV_THRESHOLDS.tbtMs,
      threshold: CWV_THRESHOLDS.tbtMs,
    },
    {
      id: "cls",
      label: "Cumulative Layout Shift",
      value: cls.numericValue,
      unit: "unitless",
      displayValue: cls.displayValue,
      pass: cls.numericValue === null ? null : cls.numericValue <= CWV_THRESHOLDS.cls,
      threshold: CWV_THRESHOLDS.cls,
    },
  ];

  return { status: "generated", strategy, url, categories, metrics };
}

/**
 * Runs one PageSpeed Insights query for one strategy. Never throws: network
 * failures, non-OK responses, and unparsable bodies all resolve to a
 * `status: "failed"` result with `detail` explaining why.
 */
export async function runPagespeed(url: string, strategy: PsiStrategy): Promise<PsiRunResult> {
  const emptyCategories: PsiCategoryScores = { performance: null, accessibility: null, bestPractices: null, seo: null };

  let response: Response;
  try {
    response = await fetch(buildUrl(url, strategy), { method: "GET" });
  } catch (error) {
    return {
      status: "failed",
      strategy,
      url,
      categories: emptyCategories,
      metrics: [],
      detail: `PageSpeed Insights request failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    return {
      status: "failed",
      strategy,
      url,
      categories: emptyCategories,
      metrics: [],
      detail: `PageSpeed Insights returned HTTP ${response.status}${bodyText ? `: ${bodyText.slice(0, 300)}` : ""}`,
    };
  }

  try {
    const json = await response.json();
    return mapPsiResponse(json, strategy, url);
  } catch (error) {
    return {
      status: "failed",
      strategy,
      url,
      categories: emptyCategories,
      metrics: [],
      detail: `PageSpeed Insights returned an unparsable response: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/** Runs both mobile and desktop strategies for one URL. */
export async function runPagespeedBothStrategies(url: string): Promise<{ mobile: PsiRunResult; desktop: PsiRunResult }> {
  const [mobile, desktop] = await Promise.all([runPagespeed(url, "mobile"), runPagespeed(url, "desktop")]);
  return { mobile, desktop };
}

export function isPagespeedConfigured(): boolean {
  return Boolean(process.env.PAGESPEED_API_KEY);
}
