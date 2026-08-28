import type { Metadata } from "next";
import { getProviderStatuses } from "@/lib/authority/providers";
import { getAutopilotStatus } from "@/lib/authority/autonomous-ranking";
import { AutopilotControl } from "../AutopilotControl";

export const metadata: Metadata = { title: "Authority Settings", robots: { index: false, follow: false } };

export default async function AuthoritySettingsPage() {
  const providers = getProviderStatuses();
  const autopilot = await getAutopilotStatus();

  return (
    <main className="main authority-page">
      <section className="hero">
        <p className="eyebrow">Authority Engine</p>
        <h1>System control</h1>
        <p className="summary">Keep the workspace public while autonomous actions stay private, explicit and reversible.</p>
      </section>

      <AutopilotControl currentMode={autopilot.mode} />

      <section className="authority-panel">
        <h2>Autonomy policy</h2>
        <p>Current mode: <strong>{autopilot.mode}</strong></p>
        <p>Daily ceiling: <strong>{autopilot.maxNewPagesPerDay}</strong> new pages and <strong>{autopilot.maxRevisionsPerDay}</strong> revisions.</p>
        <p>Scheduled autonomy: <strong>{process.env.AUTOPILOT_SCHEDULE_ENABLED === "true" ? "ARMED" : "OFF"}</strong></p>
        <p className="authority-empty">Even in Controlled mode, blocked claims and approval-required content remain stopped by the existing risk gates.</p>
      </section>

      <section className="provider-grid">
        {providers.map((provider) => (
          <article className="metric-tile" key={provider.name}>
            <span>{provider.label}</span>
            <strong>{provider.configured ? "Ready" : "Needs keys"}</strong>
            <p>{provider.configured ? "Server-side environment configured" : `Missing ${provider.missing.join(", ")}`}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
