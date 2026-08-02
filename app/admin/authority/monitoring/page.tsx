import type { Metadata } from "next";
import { getAuthorityDashboardData } from "@/lib/authority/monitoring";

export const metadata: Metadata = { title: "Authority Monitoring Runs", robots: { index: false, follow: false } };

export default async function AuthorityMonitoringPage() {
  const data = await getAuthorityDashboardData();
  return (
    <main className="authority-module">
      <section className="authority-heading">
        <p className="eyebrow">Authority Engine</p>
        <h1>Monitoring Runs</h1>
        <p className="summary">Inspect provider responses, extraction results and raw answer snapshots.</p>
      </section>
      <section className="authority-table">
        <div className="authority-table-head authority-editorial-row"><span>Prompt</span><span>Status</span><span>Responses</span><span>Started</span><span>Completed</span></div>
        {data.runs.length === 0 ? <p className="empty-state">No persisted monitoring runs yet.</p> : data.runs.map((run) => (
          <article className="authority-editorial-row" key={run.id}>
            <a href={`/admin/authority/observatory/runs/${run.id}`}>{run.prompt.label}</a><span>{run.status}</span><span>{run.responses.length}</span><span>{run.startedAt}</span><span>{run.completedAt}</span>
          </article>
        ))}
      </section>
    </main>
  );
}
