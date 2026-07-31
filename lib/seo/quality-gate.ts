export interface QualityInput {
  authoritativeSources: number;
  unsupportedClaims: number;
  similarityScore: number;
  internalLinks: number;
  hasConversionAction: boolean;
  hasCanonical: boolean;
  datesValidated: boolean;
  hasParentHub?: boolean;
  hasPenaltyClaims?: boolean;
  penaltyClaimsSourced?: boolean;
  legalInterpretation?: boolean;
  isDuplicateIntent?: boolean;
}

export function calculateQualityScore(input: QualityInput): number {
  let score = 100;
  if (input.authoritativeSources < 2) score -= 30;
  score -= input.unsupportedClaims * 15;
  if (input.similarityScore > 0.78) score -= 35;
  if (input.internalLinks < 3) score -= 10;
  if (input.hasParentHub === false) score -= 10;
  if (!input.hasConversionAction) score -= 10;
  if (!input.hasCanonical) score -= 10;
  if (!input.datesValidated) score -= 30;
  if (input.hasPenaltyClaims && !input.penaltyClaimsSourced) score -= 30;
  if (input.isDuplicateIntent) score -= 25;
  return Math.max(0, score);
}

export type PublishingDecision = "publish" | "review" | "reject";

export function publishingDecision(score: number, legalInterpretation: boolean): PublishingDecision {
  if (score < 80) return "reject" as const;
  if (legalInterpretation) return "review" as const;
  return "publish" as const;
}

export function shouldNoindex(decision: PublishingDecision): boolean {
  return decision !== "publish";
}

export function evaluateQuality(input: QualityInput) {
  const score = calculateQualityScore(input);
  const decision = publishingDecision(score, Boolean(input.legalInterpretation));
  return {
    score,
    decision,
    noindex: shouldNoindex(decision),
    blockers: qualityBlockers(input, score),
  };
}

export function qualityBlockers(input: QualityInput, score = calculateQualityScore(input)): string[] {
  const blockers: string[] = [];
  if (input.authoritativeSources < 2) blockers.push("Requires at least two official or primary sources.");
  if (input.unsupportedClaims > 0) blockers.push("Contains unsupported claims.");
  if (input.similarityScore > 0.78 || input.isDuplicateIntent) blockers.push("Risks duplication or keyword cannibalization.");
  if (input.internalLinks < 3) blockers.push("Requires at least three relevant internal links.");
  if (input.hasParentHub === false) blockers.push("Requires a parent framework hub or cluster page.");
  if (!input.hasConversionAction) blockers.push("Requires an assessment, demo or product action.");
  if (!input.hasCanonical) blockers.push("Requires a canonical URL.");
  if (!input.datesValidated) blockers.push("Requires separate validation of publication, application and enforcement dates.");
  if (input.hasPenaltyClaims && !input.penaltyClaimsSourced) blockers.push("Penalty claims require explicit source support.");
  if (score < 80) blockers.push("Quality score is below the publication threshold.");
  return blockers;
}
