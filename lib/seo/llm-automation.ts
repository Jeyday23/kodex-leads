import { getIndexedContentPages } from "./content";
import { getSiteUrl } from "./config";
import { getSeoSupabase } from "./db";
import { generateWithConfiguredProviders, getAiProviderStatuses } from "./llm-providers";
import { queueRevisionTasks, storeAuditEventLocally } from "./local-store";
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
  const generated = providerResults.filter((provider) => provider.status === "generated" && provider.text.trim().length > 0);
  const revisionTasks = await queueRevisionTasks(
    generated.flatMap((provider) =>
      pages.slice(0, 8).flatMap((page) => recommendationsToTasks(provider.provider, page.id, provider.text))
    )
  );
  const citationPresence = pages.flatMap((page) => {
    const url = `${getSiteUrl()}${pathForSeoPage(page)}`;
    return generated.map((provider) => ({
      contentId: page.id,
      provider: provider.provider,
      targetQuery: page.primaryKeyword ?? page.title,
      cited: provider.text.includes(url) || provider.text.includes(pathForSeoPage(page)),
      checkedAt: new Date().toISOString(),
    }));
  });
  await persistAnswerEngineOutputs(revisionTasks, citationPresence);
  const result = {
    checkedAt: new Date().toISOString(),
    providerStatuses: getAiProviderStatuses(),
    providerResults,
    revisionTasks,
    citationPresence,
    nonOperationalBrief: generated.length === 0
      ? {
          status: "non-operational",
          summary: "No AI provider produced live output. Configure ChatGPT/OpenAI, Claude or Perplexity credentials before this cycle can create answer-engine revision tasks.",
          indexedUrls,
        }
      : null,
    indexedUrls,
  };

  await storeAuditEventLocally({
    eventType: "llm_placement_cycle_completed",
    payload: {
      indexedUrls: indexedUrls.length,
      generatedProviders: providerResults.filter((provider) => provider.status === "generated").map((provider) => provider.provider),
      skippedProviders: providerResults.filter((provider) => provider.status === "skipped").map((provider) => provider.provider),
      failedProviders: providerResults.filter((provider) => provider.status === "failed").map((provider) => provider.provider),
      queuedRevisionTasks: revisionTasks.length,
      citationPresence,
    },
  });

  return result;
}

async function persistAnswerEngineOutputs(
  revisionTasks: Array<{ contentId: string; source: "openai" | "anthropic" | "perplexity" | "source-monitor"; targetQuery: string; recommendedChange: string }>,
  citationPresence: Array<{ contentId: string; provider: string; targetQuery: string; cited: boolean; checkedAt: string }>
) {
  const supabase = getSeoSupabase();
  if (!supabase) return;
  if (revisionTasks.length > 0) {
    await supabase.from("answer_engine_revision_tasks").insert(revisionTasks.map((task) => ({
      content_id: task.contentId,
      source: task.source,
      target_query: task.targetQuery,
      recommended_change: task.recommendedChange,
      status: "queued",
    })));
  }
  if (citationPresence.length > 0) {
    await supabase.from("answer_engine_citation_checks").insert(citationPresence.map((check) => ({
      content_id: check.contentId,
      provider: check.provider,
      target_query: check.targetQuery,
      cited: check.cited,
      checked_at: check.checkedAt,
    })));
  }
}

function recommendationsToTasks(source: "openai" | "anthropic" | "perplexity", contentId: string, text: string) {
  return text
    .split(/\n+/)
    .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
    .filter((line) => line.length > 24)
    .slice(0, 4)
    .map((line) => ({
      contentId,
      source,
      targetQuery: extractTargetQuery(line),
      recommendedChange: line,
    }));
}

function extractTargetQuery(line: string): string {
  const quoted = line.match(/["“](.+?)["”]/);
  if (quoted?.[1]) return quoted[1].slice(0, 140);
  return line.split(":")[0].slice(0, 140);
}
