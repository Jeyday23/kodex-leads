import "server-only";
import { getIndexedContentPages } from "./content";
import { getSiteUrl } from "./config";
import { generateWithConfiguredProviders, getAiProviderStatuses } from "./llm-providers";
import { storeAuditEventLocally } from "./local-store";
import { pathForSeoPage } from "./urls";

export async function runLlmPlacementCycle() {
  const pages = await getIndexedContentPages();
  const indexedUrls = pages.map((page) => `${getSiteUrl()}${pathForSeoPage(page)}`);
  const system =
    "You are an SEO and answer-engine optimization analyst. Produce concise, source-aware recommendations that improve Google rankings and LLM answer citations without making unsupported claims.";
  const prompt = [
    "Review these Kodex indexable pages for Google and LLM discoverability.",
    "Return: likely query intents, entity gaps, answer snippets, citation improvements, and conversion recommendations.",
    ...indexedUrls.map((url) => `- ${url}`),
  ].join("\n");

  const providerResults = await generateWithConfiguredProviders({ system, prompt, maxTokens: 900 });
  const fallbackBrief = buildFallbackBrief(indexedUrls);
  const result = {
    checkedAt: new Date().toISOString(),
    providerStatuses: getAiProviderStatuses(),
    providerResults,
    fallbackBrief,
    indexedUrls,
  };

  await storeAuditEventLocally({
    eventType: "llm_placement_cycle_completed",
    payload: {
      indexedUrls: indexedUrls.length,
      generatedProviders: providerResults.filter((provider) => provider.status === "generated").map((provider) => provider.provider),
      skippedProviders: providerResults.filter((provider) => provider.status === "skipped").map((provider) => provider.provider),
      failedProviders: providerResults.filter((provider) => provider.status === "failed").map((provider) => provider.provider),
    },
  });

  return result;
}

function buildFallbackBrief(indexedUrls: string[]) {
  return {
    status: "local",
    summary: "No live AI provider output is required for local operation. Configure provider keys and model env vars to run live ChatGPT, Claude and Perplexity analysis.",
    recommendations: [
      "Keep every indexable page backed by official sources and JSON-LD Article/Breadcrumb data.",
      "Add concise answer-first sections that directly satisfy commercial search and answer-engine questions.",
      "Maintain /llms.txt and /api/seo/ai-sitemap so LLM crawlers and retrieval systems can discover canonical URLs.",
      "Use Search Console queries and Perplexity web-grounded checks to identify terms where Kodex should be cited but is absent.",
      "Route all high-intent pages into assessment forms with preserved landing-page attribution.",
    ],
    indexedUrls,
  };
}
