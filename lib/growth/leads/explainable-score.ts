// WS3 explainable lead scoring. Pure and deterministic: the same input
// against the same bundle always produces the same confidence and factors,
// and every factor's contribution can be traced back to a weight and a
// match ratio. No network, no LLM call - see rationale.ts for the narrative
// layer that sits on top of this.

import type { BrainContextBundle } from "@/lib/growth/context";

export type EmployerRelationship = "target" | "partner" | "competitor" | "unknown";

export interface ExplainableScoreInput {
  personTitle?: string;
  companyVertical?: string;
  geography?: string;
  companySize?: string;
  /** 0..1 strength of the underlying signal(s) that surfaced this lead. */
  signalStrength?: number;
  /** ISO timestamp of the most recent signal detection. */
  signalDetectedAt?: string;
  employerRelationship?: EmployerRelationship;
  now?: string;
}

export interface ScoreFactor {
  factor: string;
  weight: number;
  contribution: number;
  evidence: string;
  howToImprove: string;
}

export interface ExplainableScoreResult {
  confidence: number;
  factors: ScoreFactor[];
  whatWouldMoveTheScore: string[];
}

const GENERIC_ROLE_KEYWORDS = ["compliance", "privacy", "legal", "security", "ciso", "cto", "founder", "ceo", "dpo", "risk"];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function listIncludesFuzzy(needle: string, list: string[]): boolean {
  const normalizedNeedle = normalize(needle);
  return list.some((item) => {
    const normalizedItem = normalize(item);
    return normalizedItem.length > 0 && (normalizedNeedle.includes(normalizedItem) || normalizedItem.includes(normalizedNeedle));
  });
}

function roleMatchRatio(title: string | undefined, bundle: BrainContextBundle): { ratio: number; evidence: string } {
  if (!title || title.trim().length === 0) {
    return { ratio: 0, evidence: "No job title on this lead." };
  }
  const { icp } = bundle.profile;
  if (listIncludesFuzzy(title, icp.championRoles)) {
    return { ratio: 1, evidence: `"${title}" matches a champion role (${icp.championRoles.join(", ")}).` };
  }
  if (listIncludesFuzzy(title, icp.buyingRoles)) {
    return { ratio: 0.8, evidence: `"${title}" matches a buying role (${icp.buyingRoles.join(", ")}).` };
  }
  if (listIncludesFuzzy(title, icp.userRoles)) {
    return { ratio: 0.6, evidence: `"${title}" matches a user role (${icp.userRoles.join(", ")}).` };
  }
  if (listIncludesFuzzy(title, GENERIC_ROLE_KEYWORDS)) {
    return { ratio: 0.4, evidence: `"${title}" contains a compliance-adjacent keyword but is not one of the ICP roles.` };
  }
  return { ratio: 0.2, evidence: `"${title}" does not match any ICP role.` };
}

function verticalMatchRatio(vertical: string | undefined, bundle: BrainContextBundle): { ratio: number; evidence: string } {
  if (!vertical || vertical.trim().length === 0) return { ratio: 0, evidence: "No vertical recorded for this lead." };
  const match = listIncludesFuzzy(vertical, bundle.profile.icp.targetVerticals);
  return match
    ? { ratio: 1, evidence: `"${vertical}" matches a target vertical.` }
    : { ratio: 0.2, evidence: `"${vertical}" is outside the listed target verticals.` };
}

function geographyMatchRatio(geography: string | undefined, bundle: BrainContextBundle): { ratio: number; evidence: string } {
  if (!geography || geography.trim().length === 0) return { ratio: 0, evidence: "No geography recorded for this lead." };
  const match = listIncludesFuzzy(geography, bundle.profile.icp.geographies);
  return match
    ? { ratio: 1, evidence: `"${geography}" matches a target geography.` }
    : { ratio: 0.2, evidence: `"${geography}" is outside the listed target geographies.` };
}

function companySizeMatchRatio(size: string | undefined, bundle: BrainContextBundle): { ratio: number; evidence: string } {
  if (!size || size.trim().length === 0) return { ratio: 0, evidence: "No company size recorded for this lead." };
  const exact = bundle.profile.icp.companySizes.some((candidate) => normalize(candidate) === normalize(size));
  if (exact) return { ratio: 1, evidence: `"${size}" is an exact ICP company-size match.` };
  return { ratio: 0.3, evidence: `"${size}" is not one of the listed ICP company sizes.` };
}

function signalStrengthRatio(strength: number | undefined): { ratio: number; evidence: string } {
  if (strength === undefined) return { ratio: 0, evidence: "No signal strength recorded." };
  const clamped = Math.max(0, Math.min(1, strength));
  return { ratio: clamped, evidence: `Underlying signal strength recorded as ${clamped.toFixed(2)}.` };
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function recencyRatio(detectedAt: string | undefined, nowIso: string | undefined): { ratio: number; evidence: string } {
  if (!detectedAt) return { ratio: 0, evidence: "No signal detection date recorded." };
  const now = nowIso ? new Date(nowIso).getTime() : Date.now();
  const detected = new Date(detectedAt).getTime();
  if (Number.isNaN(detected)) return { ratio: 0, evidence: "Signal detection date could not be parsed." };
  const ageDays = Math.max(0, (now - detected) / MS_PER_DAY);
  if (ageDays <= 7) return { ratio: 1, evidence: `Signal detected ${ageDays.toFixed(1)} days ago.` };
  if (ageDays <= 30) return { ratio: 0.7, evidence: `Signal detected ${ageDays.toFixed(1)} days ago.` };
  if (ageDays <= 90) return { ratio: 0.4, evidence: `Signal detected ${ageDays.toFixed(1)} days ago.` };
  return { ratio: 0.1, evidence: `Signal detected ${ageDays.toFixed(1)} days ago (stale).` };
}

function employerRelationshipRatio(relationship: EmployerRelationship | undefined): { ratio: number; evidence: string } {
  if (relationship === "target") return { ratio: 1, evidence: "Employer is a direct ICP target, not a competitor or partner." };
  if (relationship === "partner") return { ratio: 0.5, evidence: "Employer is a partner organisation, not a direct buyer." };
  if (relationship === "competitor") return { ratio: 0, evidence: "Employer is a known competitor, not a buyer." };
  return { ratio: 0.3, evidence: "Employer relationship is unknown." };
}

interface FactorSpec {
  factor: string;
  weight: number;
  result: { ratio: number; evidence: string };
  howToImprove: string;
}

/**
 * Scores a lead against the bundle's ICP with a fixed set of weighted
 * factors. Weights sum to 100; `confidence` is the sum of each factor's
 * contribution (weight * ratio), clamped to [0, 100]. Every factor is
 * computed independently and deterministically from `input` and `bundle`
 * alone, so calling this twice with the same arguments always returns an
 * identical result.
 */
export function scoreLeadExplainably(input: ExplainableScoreInput, bundle: BrainContextBundle): ExplainableScoreResult {
  const specs: FactorSpec[] = [
    {
      factor: "Role match vs ICP",
      weight: 25,
      result: roleMatchRatio(input.personTitle, bundle),
      howToImprove: "Confirm the contact's exact title, or find a more senior compliance/security/legal contact at this company.",
    },
    {
      factor: "Vertical fit",
      weight: 15,
      result: verticalMatchRatio(input.companyVertical, bundle),
      howToImprove: "Verify the company's regulatory exposure (which frameworks actually apply to them).",
    },
    {
      factor: "Geography fit",
      weight: 10,
      result: geographyMatchRatio(input.geography, bundle),
      howToImprove: "Confirm the company's operating geography or EU/DACH presence.",
    },
    {
      factor: "Company size fit",
      weight: 15,
      result: companySizeMatchRatio(input.companySize, bundle),
      howToImprove: "Confirm headcount from a source like LinkedIn or the company register.",
    },
    {
      factor: "Signal strength",
      weight: 20,
      result: signalStrengthRatio(input.signalStrength),
      howToImprove: "Find a corroborating signal (a second hiring post, a stack fingerprint, a regulatory trigger).",
    },
    {
      factor: "Recency",
      weight: 10,
      result: recencyRatio(input.signalDetectedAt, input.now),
      howToImprove: "Re-run signal detection to confirm the trigger is still live.",
    },
    {
      factor: "Employer relationship",
      weight: 5,
      result: employerRelationshipRatio(input.employerRelationship),
      howToImprove: "Confirm this company is a genuine prospect and not a competitor or existing partner.",
    },
  ];

  const factors: ScoreFactor[] = specs.map((spec) => ({
    factor: spec.factor,
    weight: spec.weight,
    contribution: Number((spec.weight * spec.result.ratio).toFixed(4)),
    evidence: spec.result.evidence,
    howToImprove: spec.howToImprove,
  }));

  const rawConfidence = factors.reduce((total, factor) => total + factor.contribution, 0);
  const confidence = Math.max(0, Math.min(100, Number(rawConfidence.toFixed(4))));

  const whatWouldMoveTheScore = [...specs]
    .map((spec) => ({ ...spec, potentialGain: spec.weight * (1 - spec.result.ratio) }))
    .filter((spec) => spec.potentialGain > 0.5)
    .sort((a, b) => b.potentialGain - a.potentialGain)
    .slice(0, 3)
    .map((spec) => spec.howToImprove);

  return { confidence, factors, whatWouldMoveTheScore };
}
