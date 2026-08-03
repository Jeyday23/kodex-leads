import type { Metadata } from "next";
import { AuthorityActionButton } from "../AuthorityActions";
import { getAuthorityDashboardData } from "@/lib/authority/monitoring";
import { getAuthoritySystemStatus } from "@/lib/authority/status";
import { listOpportunities } from "@/lib/authority/opportunities";

export const metadata: Metadata = { title: "Authority Command", robots: { index: false, follow: false } };

export default async function AuthorityCommandPage() {
  const [authority, status, opportunities] = await Promise.all([
    getAuthorityDashboardData(),
    getAuthoritySystemStatus(),
    listOpportunities({ limit: 5 }),
  ]);

  const highPriority = opportunities.items.filter((item) => item.priorityScore >= 85);

  return (
    <main className="authority-module">
      <AuthorityTopbar section="Command" action={<AuthorityActionButton endpoint="/api/authority/opportunities/discover" label="Run discovery" />} />
      <section className="authority-heading">
        <p>Private Kodex System</p>
        <h1>Command center</h1>
        <span>Operational status for opportunities, editorial, knowledge and observatory jobs.</span>
      </section>
      <section className="authority-metrics">
        <Metric label="Active opportunities" value={opportunities.items.length} />
        <Metric label="High priority" value={highPriority.length} />
        <Metric label="LLM citation rate" value={`${authority.overview.citationRate}%`} />
        <Metric label="Kodex mention rate" value={`${authority.overview.mentionRate}%`} />
        <Metric label="Provider availability" value={`${authority.providerStatuses.filter((p) => p.configured).length}/${authority.providerStatuses.length}`} />
        <Metric label="Failed jobs" value={authority.overview.failureCount + status.warnings.filter((warning) => warning.includes("failure")).length} />
      </section>
      <section className="authority-split">
        <article className="authority-panel">
          <h2>Priority actions</h2>
          <div className="authority-action-row">
            <AuthorityActionButton endpoint="/api/authority/opportunities/discover" label="Run discovery" />
            <AuthorityActionButton endpoint="/api/authority/monitoring/run" label="Run LLM monitoring" />
            <AuthorityActionButton endpoint="/api/authority/retry" label="Retry failed jobs" />
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
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <article><span>{label}</span><strong>{value}</strong></article>;
}

function AuthorityTopbar({ section, action }: { section: string; action: React.ReactNode }) {
  return (
    <header className="authority-topbar">
      <div><p>Private Kodex System</p><h1>{section}</h1></div>
      <div className="authority-topbar-actions"><a className="authority-icon-button" href="/admin/authority/settings">⌕</a><a className="authority-icon-button" href="/admin/authority/command">○</a>{action}</div>
    </header>
  );
}
