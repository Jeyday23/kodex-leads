export type AutopilotMode = "off" | "draft_only" | "guarded" | "controlled";
export type ClaimCategory =
  | "legal_obligation"
  | "deadline"
  | "penalty"
  | "applicability"
  | "regulator_guidance"
  | "product_capability"
  | "competitor_comparison"
  | "quantitative_statement"
  | "general_explanation";

export function classifyRisk(input: { contentType?: string; claims: Array<{ category: ClaimCategory; verificationResult?: string }>; changeType?: string; pilotCompleted?: boolean }) {
  const highRiskCategories: ClaimCategory[] = ["deadline", "penalty", "product_capability", "competitor_comparison", "legal_obligation"];
  const hasHighRiskClaim = input.claims.some((claim) => highRiskCategories.includes(claim.category));
  const hasUnsupported = input.claims.some((claim) => claim.verificationResult === "unsupported" || claim.verificationResult === "conflicting");
  if (hasUnsupported) return { riskLevel: "blocked", approvalRequired: true, reason: "Unsupported or conflicting claim." };
  if (input.changeType && ["metadata", "internal_link", "grammar"].includes(input.changeType) && !hasHighRiskClaim) {
    return { riskLevel: "low", approvalRequired: false, reason: "Low-risk non-material change." };
  }
  if (input.contentType && !input.pilotCompleted) return { riskLevel: hasHighRiskClaim ? "high" : "medium", approvalRequired: true, reason: "New public pages require approval before controlled pilot completion." };
  if (hasHighRiskClaim) return { riskLevel: "high", approvalRequired: true, reason: "Material legal, product or comparison claim." };
  return { riskLevel: "low", approvalRequired: false, reason: "All claims are verified and low risk." };
}

export function canAutopilotPublish(mode: AutopilotMode, riskLevel: string, approvalRequired: boolean): boolean {
  if (mode === "off" || mode === "draft_only") return false;
  if (mode === "guarded") return riskLevel === "low" && !approvalRequired;
  if (mode === "controlled") return !approvalRequired && riskLevel !== "blocked";
  return false;
}

export function dailyLimitReached(count: number, limit = 3): boolean {
  return count >= limit;
}

export function verifyClaim(claim: { text: string; category: ClaimCategory; sourceUrls: string[]; evidence?: string }) {
  const hardFailure = claim.category === "deadline" || claim.category === "penalty" || claim.category === "product_capability" || claim.category === "quantitative_statement";
  if (claim.sourceUrls.length === 0) {
    return { result: hardFailure ? "unsupported" : "needs_review", confidence: 0.2, reviewerRequired: true };
  }
  if (!claim.evidence || claim.evidence.trim().length < 12) {
    return { result: hardFailure ? "unsupported" : "needs_review", confidence: 0.45, reviewerRequired: true };
  }
  return { result: "verified", confidence: hardFailure ? 0.88 : 0.82, reviewerRequired: hardFailure };
}

export function detectCannibalization(query: string, pages: Array<{ primaryKeyword?: string | null; slug: string }>) {
  const normalized = normalizeText(query);
  return pages.filter((page) => normalizeText(page.primaryKeyword ?? page.slug) === normalized);
}

export function shouldPlanRevision(input: { impressions?: number; ctr?: number; averagePosition?: number | null; baselineCtr?: number; llmCitationLost?: boolean; brokenLinks?: number; sourceChanged?: boolean }) {
  if (input.llmCitationLost) return true;
  if (input.sourceChanged) return true;
  if ((input.brokenLinks ?? 0) > 0) return true;
  if ((input.impressions ?? 0) >= 100 && (input.ctr ?? 0) < (input.baselineCtr ?? 0.02)) return true;
  if (typeof input.averagePosition === "number" && input.averagePosition > 20) return true;
  return false;
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
}

/** Defaults used only to describe an unreadable settings row, never to run under. */
export const AUTOPILOT_DAILY_DEFAULTS = { newPages: 3, revisions: 10 };

/** Shape of the `authority_automation_settings` singleton (migration 014). */
export interface StoredAutopilotSettingsRow {
  mode?: string | null;
  max_new_pages_per_day?: number | string | null;
  max_revisions_per_day?: number | string | null;
  pilot_completed?: boolean | null;
  changed_at?: string | null;
}

export interface ResolvedAutopilotSettings {
  mode: AutopilotMode;
  maxNewPagesPerDay: number;
  maxRevisionsPerDay: number;
  pilotCompleted: boolean;
  changedAt: string | null;
  databaseConfigured: boolean;
  databaseError?: string;
}

/**
 * Turns a raw `authority_automation_settings` read into the autonomy status.
 *
 * Fails closed in both failure branches. A read error and a MISSING singleton
 * row both resolve to `databaseConfigured: false`, which every scheduled job
 * treats as "skip". Reporting a default mode for a row that does not exist
 * would let the pipeline run under a policy nobody stored, so the absent row is
 * an unavailable settings database, not an implicit `draft_only`.
 */
export function resolveStoredAutopilotSettings(
  row: StoredAutopilotSettingsRow | null | undefined,
  readError?: { message: string } | null,
): ResolvedAutopilotSettings {
  const unavailable: ResolvedAutopilotSettings = {
    mode: "draft_only",
    maxNewPagesPerDay: AUTOPILOT_DAILY_DEFAULTS.newPages,
    maxRevisionsPerDay: AUTOPILOT_DAILY_DEFAULTS.revisions,
    pilotCompleted: false,
    changedAt: null,
    databaseConfigured: false,
  };

  if (readError) {
    return {
      ...unavailable,
      // Surface the Postgres error: an RLS denial and a missing migration read
      // very differently, and the operator needs to tell them apart.
      databaseError: `Autonomy settings could not be read from Supabase: ${readError.message}`,
    };
  }

  if (!row) {
    return {
      ...unavailable,
      databaseError:
        "Autonomy settings are empty: authority_automation_settings has no 'global' row. "
        + "Re-apply supabase/migrations/014_autonomous_ranking_engine.sql, or save a mode on "
        + "/admin/authority/settings as a signed-in administrator.",
    };
  }

  return {
    mode: (row.mode ?? "draft_only") as AutopilotMode,
    maxNewPagesPerDay: Number(row.max_new_pages_per_day ?? AUTOPILOT_DAILY_DEFAULTS.newPages),
    maxRevisionsPerDay: Number(row.max_revisions_per_day ?? AUTOPILOT_DAILY_DEFAULTS.revisions),
    pilotCompleted: Boolean(row.pilot_completed),
    changedAt: row.changed_at ?? null,
    databaseConfigured: true,
  };
}
