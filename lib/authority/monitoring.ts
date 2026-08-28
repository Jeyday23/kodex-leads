import { randomUUID } from "node:crypto";
import { summarizeAuthority } from "./analytics";
import { extractBrandMention, extractCitations, extractCompetitorMentions, extractionConfidence } from "./citation-parser";
import { getAuthorityProviders, getProviderStatuses } from "./providers";
import { listCompetitorNames, listMonitoringPrompts, listRecentRuns, persistAuthorityCycle, persistMonitoringRun } from "./store";
import type { MonitoringRunRecord } from "./types";

export async function getAuthorityDashboardData() {
  const [prompts, competitors, runs] = await Promise.all([
    listMonitoringPrompts(),
    listCompetitorNames(),
    listRecentRuns(),
  ]);

  return {
    overview: summarizeAuthority(runs),
    prompts,
    competitors,
    runs,
    providerStatuses: getProviderStatuses(),
  };
}

export async function runAuthorityMonitoringCycle(options: { promptLimit?: number } = {}) {
  const prompts = (await listMonitoringPrompts()).slice(0, options.promptLimit ?? 5);
  const competitors = await listCompetitorNames();
  const providers = getAuthorityProviders().filter((provider) => provider.configured);
  const runs: MonitoringRunRecord[] = [];
  const failures: string[] = [];

  if (providers.length === 0) {
    return {
      status: "non-operational" as const,
      checkedAt: new Date().toISOString(),
      providerStatuses: getProviderStatuses(),
      runs,
      failures: ["No Authority Engine providers are configured in the server environment."],
    };
  }

  for (const prompt of prompts) {
    const startedAt = new Date().toISOString();
    const responses = [];
    for (const provider of providers) {
      try {
        const providerResult = await provider.execute({
          prompt: prompt.prompt,
          country: prompt.country,
          language: prompt.language,
        });
        const citations = extractCitations(providerResult.answer, providerResult.citations);
        const brand = extractBrandMention(providerResult.answer, "Kodex");
        responses.push({
          provider: provider.name,
          model: providerResult.model,
          answer: providerResult.answer,
          citations,
          brand,
          competitors: extractCompetitorMentions(providerResult.answer, competitors),
          rawResponse: providerResult.rawResponse,
          latencyMs: providerResult.latencyMs,
          estimatedCost: providerResult.estimatedCost,
          extractionConfidence: extractionConfidence(providerResult.answer, citations, brand),
        });
      } catch (error) {
        failures.push(`${provider.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const run: MonitoringRunRecord = {
      id: randomUUID(),
      prompt,
      status: failures.length > 0 && responses.length === 0 ? "failed" : "completed",
      startedAt,
      completedAt: new Date().toISOString(),
      responses,
      error: responses.length === 0 ? failures.join("\n") : undefined,
    };
    await persistMonitoringRun(run);
    runs.push(run);
    await delay(350);
  }

  await persistAuthorityCycle(runs, failures);

  return {
    status: failures.length > 0 ? "partial" as const : "ok" as const,
    checkedAt: new Date().toISOString(),
    providerStatuses: getProviderStatuses(),
    runs,
    failures,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
