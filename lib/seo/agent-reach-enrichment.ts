import "server-only";

import { readWithAgentReach } from "./agent-reach";

export interface EnrichableLead {
  companyName: string;
  website: string;
  fitReason: string;
  confidence: number;
  sourceUrl: string;
  enrichmentProvider?: string | null;
}

export interface AgentReachEnrichmentResult<T> {
  leads: T[];
  errors: string[];
  enrichedCount: number;
}

const MAX_AGENT_REACH_LEADS = 12;
const BATCH_SIZE = 4;

const buyingSignals: Array<{ label: string; pattern: RegExp; boost: number }> = [
  { label: "EU AI Act", pattern: /\beu ai act\b|\bai act\b/i, boost: 12 },
  { label: "AI governance", pattern: /\bai governance\b|\bresponsible ai\b|\bmodel governance\b/i, boost: 10 },
  { label: "GDPR/DSGVO", pattern: /\bgdpr\b|\bdsgvo\b|data protection/i, boost: 9 },
  { label: "NIS2", pattern: /\bnis2\b/i, boost: 9 },
  { label: "DORA", pattern: /\bdora\b|digital operational resilience/i, boost: 9 },
  { label: "CRA", pattern: /cyber resilience act|\bcra\b/i, boost: 8 },
  { label: "ISO 27001", pattern: /iso\s*27001/i, boost: 8 },
  { label: "SOC 2", pattern: /soc\s*2/i, boost: 8 },
  { label: "security/compliance hiring", pattern: /compliance officer|data protection officer|privacy officer|security engineer|information security/i, boost: 6 },
];

export async function enrichLeadsWithAgentReach<T extends EnrichableLead>(leads: T[]): Promise<AgentReachEnrichmentResult<T>> {
  const output = [...leads];
  const errors: string[] = [];
  let enrichedCount = 0;
  const candidates = leads.slice(0, MAX_AGENT_REACH_LEADS);

  for (let start = 0; start < candidates.length; start += BATCH_SIZE) {
    const batch = candidates.slice(start, start + BATCH_SIZE);
    const results = await Promise.allSettled(batch.map((lead) => enrichOne(lead)));

    results.forEach((result, index) => {
      const originalIndex = start + index;
      const lead = batch[index];
      if (result.status === "fulfilled") {
        output[originalIndex] = result.value as T;
        if (result.value.enrichmentProvider?.includes("agent-reach")) enrichedCount += 1;
      } else {
        errors.push(`Agent-Reach ${lead.companyName}: ${errorMessage(result.reason)}`);
      }
    });
  }

  return { leads: output, errors, enrichedCount };
}

async function enrichOne<T extends EnrichableLead>(lead: T): Promise<T> {
  const researchUrl = pickResearchUrl(lead);
  if (!researchUrl) return lead;

  const research = await readWithAgentReach(researchUrl);
  const matched = buyingSignals.filter((signal) => signal.pattern.test(research.content));
  if (matched.length === 0) return lead;

  const labels = [...new Set(matched.map((signal) => signal.label))];
  const boost = Math.min(18, Math.max(...matched.map((signal) => signal.boost)) + Math.min(6, Math.max(0, labels.length - 1) * 2));
  const provider = lead.enrichmentProvider ? `${lead.enrichmentProvider}+agent-reach` : "agent-reach";

  return {
    ...lead,
    fitReason: `${lead.fitReason} Agent-Reach verified additional public signals: ${labels.join(", ")}.`,
    confidence: Math.min(98, lead.confidence + boost),
    enrichmentProvider: provider,
  };
}

function pickResearchUrl(lead: EnrichableLead): string | null {
  for (const candidate of [lead.website, lead.sourceUrl]) {
    try {
      const url = new URL(candidate);
      if (url.protocol === "https:" || url.protocol === "http:") return url.toString();
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
