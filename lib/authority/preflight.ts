import { getAutopilotStatus } from "./autonomous-ranking";
import { getProviderStatuses } from "./providers";

export interface AutonomyPreflightCheck {
  id: string;
  label: string;
  ok: boolean;
  required: boolean;
  detail: string;
}

export async function runAutonomyPreflight() {
  const status = await getAutopilotStatus();
  const providers = getProviderStatuses();
  const configuredProviders = providers.filter((provider) => provider.configured);

  const checks: AutonomyPreflightCheck[] = [
    {
      id: "database",
      label: "Autonomy settings database",
      ok: status.databaseConfigured,
      required: true,
      detail: status.databaseConfigured ? "Supabase-backed autonomy settings are available." : "Supabase-backed autonomy settings are unavailable.",
    },
    {
      id: "control-secret",
      label: "Private control key",
      ok: Boolean(process.env.AUTOPILOT_CONTROL_SECRET),
      required: true,
      detail: process.env.AUTOPILOT_CONTROL_SECRET ? "Private control key is configured server-side." : "AUTOPILOT_CONTROL_SECRET is missing.",
    },
    {
      id: "llm-provider",
      label: "At least one LLM provider",
      ok: configuredProviders.length > 0,
      required: true,
      detail: configuredProviders.length > 0
        ? `Ready: ${configuredProviders.map((provider) => provider.label).join(", ")}.`
        : "No OpenAI, Anthropic or Perplexity provider is fully configured.",
    },
    {
      id: "schedule",
      label: "Scheduled autonomy",
      ok: process.env.AUTOPILOT_SCHEDULE_ENABLED === "true",
      required: false,
      detail: process.env.AUTOPILOT_SCHEDULE_ENABLED === "true"
        ? "Background scheduling is armed; stored mode still controls whether jobs execute."
        : "Background scheduling is off. Manual private runs remain available.",
    },
    {
      id: "hunter",
      label: "Professional email enrichment",
      ok: Boolean(process.env.HUNTER_API_KEY),
      required: false,
      detail: process.env.HUNTER_API_KEY ? "Hunter enrichment is configured." : "Hunter is optional; decision-maker email enrichment will be limited.",
    },
    {
      id: "apollo",
      label: "Apollo buyer search",
      ok: Boolean(process.env.APOLLO_API_KEY),
      required: false,
      detail: process.env.APOLLO_API_KEY ? "Apollo API key is configured; People Search still depends on the Apollo plan." : "Apollo buyer search is optional and not configured.",
    },
    {
      id: "northdata",
      label: "New GmbH / UG discovery",
      ok: Boolean(process.env.NORTHDATA_API_KEY),
      required: false,
      detail: process.env.NORTHDATA_API_KEY ? "North Data company-formation discovery is configured." : "North Data is optional; new German company discovery will be skipped.",
    },
    {
      id: "search-console",
      label: "Google Search Console",
      ok: status.searchConsole?.status === "configured",
      required: false,
      detail: status.searchConsole?.note ?? "Search Console status unavailable.",
    },
  ];

  const requiredChecks = checks.filter((check) => check.required);
  const blocking = requiredChecks.filter((check) => !check.ok);

  return {
    ok: blocking.length === 0,
    nonPublishing: true,
    mode: status.mode,
    scheduleEnabled: process.env.AUTOPILOT_SCHEDULE_ENABLED === "true",
    configuredProviders: configuredProviders.map((provider) => provider.name),
    checks,
    blocking: blocking.map((check) => check.id),
    testedAt: new Date().toISOString(),
  };
}
