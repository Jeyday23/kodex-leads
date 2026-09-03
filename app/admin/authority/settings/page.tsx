import type { Metadata } from "next";
import { getProviderStatuses } from "@/lib/authority/providers";
import { getAutopilotStatus } from "@/lib/authority/autonomous-ranking";
import { AutopilotControl } from "../AutopilotControl";

export const metadata: Metadata = { title: "Authority Settings", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

interface IntegrationCard {
  name: string;
  label: string;
  purpose: string;
  configured: boolean;
  required: boolean;
  detail: string;
}

const providerPurposes: Record<string, string> = {
  openai: "LLM visibility monitoring and content analysis.",
  anthropic: "LLM visibility monitoring and content analysis.",
  perplexity: "Citation-aware answer and visibility monitoring.",
};

export default async function AuthoritySettingsPage() {
  const providers = getProviderStatuses();
  const autopilot = await getAutopilotStatus();
  const scheduleEnabled = process.env.AUTOPILOT_SCHEDULE_ENABLED === "true";
  const supabaseEnvironmentConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL
    && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );

  const integrations: IntegrationCard[] = [
    {
      name: "supabase",
      label: "Supabase",
      purpose: "Stores autonomy policy, leads, drafts and run history.",
      configured: autopilot.databaseConfigured,
      required: true,
      detail: autopilot.databaseConfigured
        ? "Settings table connected and readable."
        : supabaseEnvironmentConfigured
          ? "Credentials detected, but authority_automation_settings could not be read. Verify migrations, project access and the service-role key."
          : "Add in Render: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    },
    {
      name: "admin-session",
      label: "Administrator sign-in",
      purpose: "Authorizes manual mode changes, preflight and runs.",
      configured: true,
      required: true,
      detail: "Actions are authorized by the signed-in administrator account. No shared key is used.",
    },
    ...providers.map((provider) => ({
      ...provider,
      purpose: providerPurposes[provider.name] ?? "LLM monitoring provider.",
      required: false,
      detail: provider.configured ? "Server-side settings detected." : `Add in Render: ${provider.missing.join(", ")}.`,
    })),
    {
      name: "northdata",
      label: "North Data",
      purpose: "Discovers newly registered German GmbH and UG companies.",
      configured: Boolean(process.env.NORTHDATA_API_KEY),
      required: false,
      detail: process.env.NORTHDATA_API_KEY ? "Server-side setting detected." : "Add in the Render web service: NORTHDATA_API_KEY.",
    },
    {
      name: "hunter",
      label: "Hunter",
      purpose: "Enriches discovered companies with public professional emails.",
      configured: Boolean(process.env.HUNTER_API_KEY),
      required: false,
      detail: process.env.HUNTER_API_KEY ? "Server-side setting detected." : "Add in the Render web service: HUNTER_API_KEY.",
    },
    {
      name: "apollo",
      label: "Apollo",
      purpose: "Finds relevant buyers and decision makers when the plan permits it.",
      configured: Boolean(process.env.APOLLO_API_KEY),
      required: false,
      detail: process.env.APOLLO_API_KEY ? "Server-side setting detected." : "Add in the Render web service: APOLLO_API_KEY.",
    },
  ];

  return (
    <main className="main authority-page kx-settings-page">
      <section className="hero kx-settings-hero">
        <p className="eyebrow">Authority Engine</p>
        <h1>Autonomy & integrations</h1>
        <p className="summary">
          This is the governance screen for the discovery and content pipeline. It controls permissions, runs a safe configuration check and starts one manual cycle.
        </p>
        <div className="kx-purpose-grid" aria-label="What this page controls">
          <div><span>01</span><strong>Set boundaries</strong><p>Choose whether the engine is off, drafts only or may publish within risk gates.</p></div>
          <div><span>02</span><strong>Verify setup</strong><p>Check database, provider and safety configuration without creating anything.</p></div>
          <div><span>03</span><strong>Run deliberately</strong><p>Start one authorized cycle and review its leads, opportunities and drafts.</p></div>
        </div>
      </section>

      <AutopilotControl
        currentMode={autopilot.mode}
        scheduleEnabled={scheduleEnabled}
        databaseConfigured={autopilot.databaseConfigured}
        maxNewPagesPerDay={autopilot.maxNewPagesPerDay}
        maxRevisionsPerDay={autopilot.maxRevisionsPerDay}
        changedAt={autopilot.changedAt}
      />

      <section className="kx-integrations" aria-labelledby="integrations-heading">
        <header>
          <div>
            <p className="eyebrow">Server configuration</p>
            <h2 id="integrations-heading">Integration readiness</h2>
            <p>These cards report whether the expected environment values exist. They do not expose the values or guarantee provider quota.</p>
          </div>
          <a href="https://dashboard.render.com/" target="_blank" rel="noreferrer">Open Render dashboard ↗</a>
        </header>

        <div className="kx-key-guidance">
          <strong>Provider keys are not entered on this page.</strong>
          <span>Add them to the Render web service environment, save changes and wait for the service to redeploy. This screen never accepts a provider key.</span>
        </div>

        <div className="kx-integration-grid">
          {integrations.map((integration) => (
            <article className="kx-integration-card" data-configured={integration.configured ? "true" : "false"} key={integration.name}>
              <div className="kx-integration-card-topline">
                <span>{integration.required ? "Required" : "Optional"}</span>
                <b>{integration.configured ? "Configured" : integration.required ? "Needs attention" : "Not configured"}</b>
              </div>
              <h3>{integration.label}</h3>
              <p>{integration.purpose}</p>
              <small>{integration.detail}</small>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
