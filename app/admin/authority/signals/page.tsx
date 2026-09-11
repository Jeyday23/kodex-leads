import type { Metadata } from "next";
import { getBrainContextBundle } from "@/lib/growth/context";
import { listSignalEvents } from "@/lib/growth/signals/store";
import { jSearchHiringProvider, adzunaHiringProvider } from "@/lib/growth/signals/providers/hiring";
import { stackSignalProvider } from "@/lib/growth/signals/providers/stack";
import { regulatorySignalProvider } from "@/lib/growth/signals/providers/regulatory";
import { AuthorityActionButton } from "@/app/admin/authority/AuthorityActions";
import ManualSignalForm from "./ManualSignalForm";

export const metadata: Metadata = { title: "Growth Signals", robots: { index: false, follow: false } };

function providerBadge(label: string, status: { configured: boolean; missing: string[] }) {
  return (
    <div className="metric-tile" key={label}>
      <span>{label}</span>
      <strong>{status.configured ? "Configured" : `Not configured (set ${status.missing.join(", ")})`}</strong>
    </div>
  );
}

export default async function GrowthSignalsPage() {
  const bundle = await getBrainContextBundle();
  const events = await listSignalEvents({ limit: 40 });

  const providerStatuses = [
    { label: "Hiring (JSearch)", status: jSearchHiringProvider.status() },
    { label: "Hiring (Adzuna)", status: adzunaHiringProvider.status() },
    { label: "Vendor stack detector", status: stackSignalProvider.status() },
    { label: "Regulatory bridge", status: regulatorySignalProvider.status() },
  ];

  return (
    <main className="authority-module">
      <header className="authority-topbar">
        <div>
          <p>Private Kodex System</p>
          <h1>Growth signals</h1>
          <p>Keyword, competitor, influencer, own-brand, hiring, stack, regulatory and manual signals feeding the lead pipeline.</p>
        </div>
        <AuthorityActionButton endpoint="/api/growth/signals/run" label="Run signal providers" />
      </header>

      <section className="dashboard-grid" aria-label="Provider status">
        {providerStatuses.map((entry) => providerBadge(entry.label, entry.status))}
      </section>

      <section className="authority-panel">
        <h2>Signal configuration</h2>
        <p>Signal types live on the Brain bundle and are edited from the Brain module once it lands.</p>
        <dl className="authority-detail-grid">
          {bundle.signalConfigs.map((config) => (
            <div key={config.type}>
              <dt>{config.type}</dt>
              <dd>{config.enabled ? "Enabled" : "Disabled"}{config.targets.length > 0 ? ` - ${config.targets.join(", ")}` : ""}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="authority-panel">
        <h2>Report a manual signal</h2>
        <ManualSignalForm />
      </section>

      <section className="authority-panel">
        <h2>Recent signal events</h2>
        {events.length === 0 ? (
          <p className="authority-empty">
            {process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
              ? "No signal events recorded yet. Run the providers or report a manual signal above."
              : "Supabase is not configured, so no signal events can be stored or listed yet."}
          </p>
        ) : (
          <ul className="authority-stack">
            {events.map((event) => (
              <li key={event.dedupeKey}>
                <strong>{event.type}</strong> - {event.companyName ?? event.companyDomain ?? "Unknown company"} ({event.source}, strength {event.strength.toFixed(2)})
                {event.url ? <> - <a href={event.url} target="_blank" rel="noreferrer">source ↗</a></> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
