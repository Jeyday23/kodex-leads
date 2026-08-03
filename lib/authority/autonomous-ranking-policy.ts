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
