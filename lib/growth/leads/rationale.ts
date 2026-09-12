// WS3 lead-score rationale. Calls generateText() only when a provider is
// actually configured (never assumed); otherwise builds an honest templated
// sentence from the highest-contributing factors so the UI never shows a
// blank or fabricated explanation.

import { generateText, getGrowthLlmStatus } from "@/lib/growth/llm";
import type { ExplainableScoreResult } from "./explainable-score";

export interface LeadRationaleResult {
  rationale: string;
  source: "llm" | "template";
}

function topFactors(result: ExplainableScoreResult, count: number) {
  return [...result.factors].sort((a, b) => b.contribution - a.contribution).slice(0, count);
}

function templatedRationale(result: ExplainableScoreResult, companyName: string): string {
  const top = topFactors(result, 2).filter((factor) => factor.contribution > 0);
  if (top.length === 0) {
    return `${companyName} scored ${result.confidence.toFixed(0)}/100. No factor contributed meaningfully; more information is needed before this is a strong lead.`;
  }
  const explanation = top.map((factor) => `${factor.factor.toLowerCase()} (${factor.evidence})`).join(" and ");
  return `${companyName} scored ${result.confidence.toFixed(0)}/100, driven mainly by ${explanation}.`;
}

/**
 * Produces a human-readable rationale for a lead score. Uses the LLM only
 * when `getGrowthLlmStatus().configured` is true; falls back to a templated
 * sentence built from the top-contributing factors otherwise, so the caller
 * never sees a blank explanation and nothing is ever fabricated.
 */
export async function buildLeadRationale(result: ExplainableScoreResult, companyName: string): Promise<LeadRationaleResult> {
  const status = getGrowthLlmStatus();
  if (!status.configured) {
    return { rationale: templatedRationale(result, companyName), source: "template" };
  }

  const factorSummary = result.factors
    .map((factor) => `${factor.factor}: weight ${factor.weight}, contribution ${factor.contribution.toFixed(1)}, evidence: ${factor.evidence}`)
    .join("\n");

  const generation = await generateText({
    system:
      "You write one short, factual sentence explaining a lead score to a founder. Use only the factors given. Never invent facts. Never use an em dash.",
    prompt: `Company: ${companyName}\nConfidence: ${result.confidence.toFixed(0)}/100\nFactors:\n${factorSummary}\n\nWrite one sentence explaining why this lead scored this way.`,
    maxTokens: 200,
  });

  if (generation.status !== "generated" || generation.text.trim().length === 0) {
    return { rationale: templatedRationale(result, companyName), source: "template" };
  }

  return { rationale: generation.text.trim(), source: "llm" };
}
