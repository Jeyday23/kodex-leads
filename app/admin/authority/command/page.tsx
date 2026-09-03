import type { Metadata } from "next";
import { AuthorityActionButton } from "../AuthorityActions";
import { getAuthorityDashboardData } from "@/lib/authority/monitoring";
import { getAuthoritySystemStatus } from "@/lib/authority/status";
import { listOpportunities } from "@/lib/authority/opportunities";
import { getAutopilotStatus, listContentAssets, listPublications, listRevisionPlans } from "@/lib/authority/autonomous-ranking";

export const metadata: Metadata = { title: "Authority Command", robots: { index: false, follow: false } };

export default async function AuthorityCommandPage() {
  const [authority, status, opportunities, autopilot, content, publications, revisions] = await Promise.all([
    getAuthorityDashboardData(),
    getAuthoritySystemStatus(),
    listOpportunities({ limit: 5 }),
    getAutopilotStatus(),
    listContentAssets(5),
    listPublications(),
    listRevisionPlans(),
  ]);

  const highPriority = opportunities.items.filter((item) => item.priorityScore >= 85);

  return (
    <main className="authority-module">
      <AuthorityTopbar section="Command" action={<a className="authority-primary" href="/admin/authority/settings" title="Configure autonomy, integrations and private controls">Autonomy controls</a>} />
      <section className="authority-heading">
        <p>Kodex Growth Intelligence</p>
        <h1>Command center</h1>
        <span>Operational status for opportunities, editorial, knowledge, search and observatory jobs.</span>
      </section>
      <section className="authority-metrics">
        <Metric label="Active opportunities" value={opportunities.items.length} />
        <Metric label="High priority" value={highPriority.length} />
        <Metric label="LLM citation rate" value={`${authority.overview.citationRate}%`} />
        <Metric label="Kodex mention rate" value={`${authority.overview.mentionRate}%`} />
        <Metric label="Provider availability" value={`${authority.providerStatuses.filter((p) => p.configured).length}/${authority.providerStatuses.length}`} />
        <Metric label="Failed jobs" value={authority.overview.failureCount + status.warnings.filter((warning) => warning.includes("failure")).length} />
        <Metric label="Autopilot mode" value={autopilot.mode} />
        <Metric label="Content assets" value={content.length} />
      </section>
      <section className="authority-panel">
        <h2>Autonomous pipeline</h2>
        <div className="authority-pipeline">
          {["discover", "research", "brief", "draft", "validate", "approve", "publish", "verify", "monitor", "diagnose", "revise"].map((stage) => (
            <span key={stage}>{stage}</span>
          ))}
        </div>
        <p className="authority-empty">Mode: {autopilot.mode}. Daily limits: {autopilot.maxNewPagesPerDay} new pages, {autopilot.maxRevisionsPerDay} revisions.</p>
        <div className="authority-action-row"><a className="authority-link-button" href="/admin/authority/settings" title="Change autonomy mode and run the non-publishing safety preflight">Change autonomy mode →</a></div>
      </section>
      <section className="authority-split">
        <article className="authority-panel">
          <h2>Priority actions</h2>
          <div className="authority-action-row">
            <AuthorityActionButton endpoint="/api/authority/opportunities/discover" label="Run discovery" />
            <AuthorityActionButton endpoint="/api/authority/monitoring/run" label="Run LLM monitoring" />
            <AuthorityActionButton endpoint="/api/authority/retry" label="Retry failed jobs" />
            <a className="authority-primary" href="/admin/authority/settings" title="Open the protected autonomy control and preflight screen">Run autopilot privately</a>
          </div>
          {highPriority.length === 0 ? <p className="authority-empty">No high-priority opportunities currently loaded.</p> : highPriority.map((item) => (
            <a className="authority-priority-item" href={`/admin/authority/opportunities/${item.id}`} key={item.id}>
              <strong>{item.query}</strong><span>{item.priorityScore} / {item.recommendedDecision}</span>
            </a>
          ))}
        </article>
        <article className="authority-panel">
          <h2>System warnings</h2>
          {status.warnings.length === 0 ? <p className="authority-empty">All systems operational.</p> : status.warnings.map((warning) => <p className="authority-warning" key={warning}>{warning}</p>)}
        </article>
      </section>
      <section className="authority-split">
        <article className="authority-panel">
          <h2>Blocked or waiting content</h2>
          {content.length === 0 ? <p className="authority-empty">No autonomous content assets yet.</p> : content.map((item) => (
            <a className="authority-priority-item" href={`/admin/authority/content/${item.id}`} key={item.id}>
              <strong>{item.title}</strong><span>{item.status} / {item.riskLevel}</span>
            </a>
          ))}
        </article>
        <article className="authority-panel">
          <h2>Publication and revision queue</h2>
          <p>Publication events: <strong>{publications.length}</strong></p>
          <p>Open revision plans: <strong>{revisions.filter((revision) => revision.status === "open").length}</strong></p>
          <div className="authority-action-row">
            <a className="authority-link-button" href="/admin/authority/publications">Publications</a>
            <a className="authority-link-button" href="/admin/authority/revisions">Revisions</a>
          </div>
        </article>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <article><span>{label}</span><strong>{value}</strong></article>;
}

function AuthorityTopbar({ section, action }: { section: string; action: React.ReactNode }) {
  return (
    <header className="authority-topbar">
      <div><p>Kodex Growth Intelligence</p><h1>{section}</h1></div>
      <div className="authority-topbar-actions">
        <a className="authority-icon-button" href="/admin/authority/settings" aria-label="Settings and integration readiness" title="Settings: autonomy, integration readiness and API configuration">Settings</a>
        <a className="authority-icon-button" href="/admin/authority/observatory" aria-label="System status and observatory" title="System status: monitoring runs, citations, competitors and failures">Status</a>
        {action}
      </div>
    </header>
  );
}
