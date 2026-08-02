import type { LeadCaptureInput, LeadScoreResult } from "./types";

const companySizeScore: Record<LeadCaptureInput["companySize"], number> = {
  "1-10": 5,
  "11-50": 12,
  "51-200": 20,
  "201-1000": 26,
  "1000+": 30,
};

const aiUseScore: Record<LeadCaptureInput["aiUse"], number> = {
  none: 0,
  evaluating: 8,
  internal: 16,
  "customer-facing": 26,
  "high-risk": 34,
};

const maturityScore: Record<LeadCaptureInput["complianceMaturity"], number> = {
  unknown: 4,
  starting: 14,
  documented: 20,
  audited: 12,
};

const urgencyScore: Record<LeadCaptureInput["urgency"], number> = {
  researching: 4,
  "this-quarter": 16,
  "this-month": 24,
  immediate: 30,
};

export function scoreLead(input: LeadCaptureInput): LeadScoreResult {
  const reasons: string[] = [];
  let score = 0;

  score += companySizeScore[input.companySize];
  if (companySizeScore[input.companySize] >= 20) reasons.push("Company size indicates meaningful compliance exposure.");

  score += aiUseScore[input.aiUse];
  if (input.aiUse === "customer-facing" || input.aiUse === "high-risk") reasons.push("AI usage indicates meaningful compliance exposure.");

  score += maturityScore[input.complianceMaturity];
  if (input.complianceMaturity === "starting" || input.complianceMaturity === "unknown") reasons.push("Compliance program may need structure and instrumentation.");

  score += urgencyScore[input.urgency];
  if (input.urgency === "this-month" || input.urgency === "immediate") reasons.push("Timeline suggests near-term buying intent.");

  if (["eu-ai-act", "gdpr", "nis2", "dora", "cra"].includes(input.framework)) {
    score += 6;
    reasons.push("Framework aligns with Kodex assessment routing.");
  }

  score = Math.min(100, score);

  if (score >= 82) return { score, grade: "sales-ready", reasons, recommendedAction: "book-demo" };
  if (score >= 65) return { score, grade: "high", reasons, recommendedAction: "sales-review" };
  if (score >= 42) return { score, grade: "medium", reasons, recommendedAction: "send-assessment" };
  return { score, grade: "low", reasons, recommendedAction: "nurture" };
}
