export interface OpportunityScoreInput {
  buyerIntentScore: number;
  productRelevanceScore: number;
  regulatoryUrgencyScore: number;
  demandSignalScore: number;
  llmVisibilityGapScore: number;
  competitorGapScore: number;
  contentFeasibilityScore: number;
}

export const opportunityScoreWeights = {
  buyerIntentScore: 0.25,
  productRelevanceScore: 0.2,
  regulatoryUrgencyScore: 0.15,
  demandSignalScore: 0.15,
  llmVisibilityGapScore: 0.1,
  competitorGapScore: 0.1,
  contentFeasibilityScore: 0.05,
} satisfies Record<keyof OpportunityScoreInput, number>;

export type OpportunityDecision = "Build" | "Expand" | "Research" | "Merge" | "Ignore";

export function calculateOpportunityScore(input: OpportunityScoreInput): number {
  const weighted = Object.entries(opportunityScoreWeights).reduce((score, [key, weight]) => {
    return score + normalize(input[key as keyof OpportunityScoreInput]) * weight;
  }, 0);
  return Math.round(weighted);
}

export function recommendedDecision(score: number): OpportunityDecision {
  if (score >= 85) return "Build";
  if (score >= 70) return "Expand";
  if (score >= 55) return "Research";
  if (score >= 40) return "Merge";
  return "Ignore";
}

export function normalizeQuery(query: string): string {
  return query.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").replace(/\s+/g, " ").trim();
}

export function demandLabel(score: number | null | undefined): "Very high" | "High" | "Medium" | "Low" | "Unknown" {
  if (score == null) return "Unknown";
  if (score >= 85) return "Very high";
  if (score >= 70) return "High";
  if (score >= 45) return "Medium";
  return "Low";
}

function normalize(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(Math.max(value, 0), 100);
}
