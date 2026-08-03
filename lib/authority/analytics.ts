import type { AuthorityOverview, MonitoringRunRecord } from "./types";

export function summarizeAuthority(runs: MonitoringRunRecord[]): AuthorityOverview {
  const responses = runs.flatMap((run) => run.responses);
  const responseCount = responses.length;
  const promptCount = new Set(runs.map((run) => run.prompt.id)).size;
  const providerCount = new Set(responses.map((response) => response.provider)).size;
  const mentionCount = responses.filter((response) => response.brand.mentioned).length;
  const citationCount = responses.filter((response) => response.citations.some((citation) => citation.citesKodex)).length;
  const failureCount = runs.filter((run) => run.status === "failed").length;
  const mentionRate = rate(mentionCount, responseCount);
  const citationRate = rate(citationCount, responseCount);
  const visibilityScore = Math.round((mentionRate * 0.55 + citationRate * 0.45) * 100);

  return {
    visibilityScore,
    citationRate: Math.round(citationRate * 100),
    mentionRate: Math.round(mentionRate * 100),
    recentMovement: 0,
    promptCount,
    responseCount,
    providerCount,
    failureCount,
  };
}

function rate(count: number, total: number): number {
  return total === 0 ? 0 : count / total;
}
