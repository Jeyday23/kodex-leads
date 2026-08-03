import { runAutopilot } from "@/lib/authority/autonomous-ranking";
import { planRevisionsFromMetrics, repairTechnicalSeo, syncSearchConsole } from "@/lib/authority/autonomous-ranking";
import { runLlmPlacementCycle } from "@/lib/seo/llm-automation";
import { runSeoIntelligenceCycle } from "@/lib/seo/cron-cycle";

type StepResult = {
  name: string;
  status: "completed" | "action_required" | "failed";
  summary: string;
  data?: unknown;
};

export async function POST(request: Request) {
  if (!process.env.CRON_SECRET) {
    return Response.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }

  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  const steps: StepResult[] = [];

  steps.push(await runStep("SEO intelligence", async () => {
    const result = await runSeoIntelligenceCycle();
    return {
      summary: `${result.generatedDrafts} drafts, ${result.evaluatedPages} evaluated, ${result.published.length} published, ${result.queuedForReview.length} queued`,
      data: result,
    };
  }));

  steps.push(await runStep("LLM visibility", async () => {
    const result = await runLlmPlacementCycle();
    const generated = result.providerResults.filter((provider) => provider.status === "generated").length;
    return {
      summary: `${generated} providers generated output, ${result.revisionTasks.length} revision tasks queued`,
      data: result,
    };
  }));

  steps.push(await runStep("Search Console sync", async () => {
    const result = await syncSearchConsole({ actor: "operator-console" });
    return {
      summary: `${result.status}, ${result.metricsCreated ?? 0} metrics created`,
      data: result,
    };
  }));

  steps.push(await runStep("Authority autopilot", async () => {
    const result = await runAutopilot({ actor: "operator-console", modeOverride: "draft_only" });
    return {
      summary: `${result.status} in ${result.mode} mode with ${result.actions.length} actions`,
      data: result,
    };
  }));

  steps.push(await runStep("Revision planner", async () => {
    const result = await planRevisionsFromMetrics("operator-console");
    return {
      summary: `${result.planned} revision plans created`,
      data: result,
    };
  }));

  steps.push(await runStep("Technical SEO repair", async () => {
    const result = await repairTechnicalSeo("operator-console");
    return {
      summary: `${result.repaired} technical fixes recorded`,
      data: result,
    };
  }));

  const failed = steps.filter((step) => step.status === "failed");
  const actionRequired = steps.filter((step) => step.status === "action_required");
  return Response.json({
    status: failed.length > 0 ? "completed_with_failures" : actionRequired.length > 0 ? "action_required" : "completed",
    startedAt,
    completedAt: new Date().toISOString(),
    steps,
    nextActions: summarizeNextActions(steps),
  });
}

async function runStep(name: string, fn: () => Promise<{ summary: string; data: unknown }>): Promise<StepResult> {
  try {
    const result = await fn();
    return { name, status: needsAction(result.data) ? "action_required" : "completed", summary: result.summary, data: result.data };
  } catch (error) {
    return {
      name,
      status: "failed",
      summary: error instanceof Error ? error.message : "Unknown failure",
    };
  }
}

function needsAction(data: unknown): boolean {
  const text = JSON.stringify(data);
  return [
    "missing_credentials",
    "database-unavailable",
    "Supabase is not configured",
    "non-operational",
    "\"status\":\"skipped\"",
  ].some((signal) => text.includes(signal));
}

function summarizeNextActions(steps: StepResult[]) {
  const actions = new Set<string>();
  const text = JSON.stringify(steps);

  if (text.includes("missing_credentials")) actions.add("Connect Google Search Console credentials for real query and ranking data.");
  if (text.includes("OPENAI_API_KEY") || text.includes("ANTHROPIC_API_KEY") || text.includes("PERPLEXITY_API_KEY")) {
    actions.add("Configure at least one LLM provider so visibility checks can create revision tasks.");
  }
  if (text.includes("database-unavailable")) actions.add("Confirm Supabase env vars are available in the runtime running this loop.");
  if (text.includes("SEO_SOURCE_FETCH_ENABLED")) actions.add("Enable SEO_SOURCE_FETCH_ENABLED=true when you want live source hashing.");
  if (actions.size === 0) actions.add("Review queued content, revision plans and AI sitemap after each run.");

  return Array.from(actions);
}
