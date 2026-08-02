import type { Metadata } from "next";
import { getAuthorityDashboardData } from "@/lib/authority/monitoring";

export const metadata: Metadata = { title: "Authority Failures", robots: { index: false, follow: false } };

export default async function AuthorityFailuresPage() {
  const data = await getAuthorityDashboardData();
  const failures = data.runs.filter((run) => run.status === "failed");
  return (
    <main className="main authority-page">
      <section className="hero">
        <p className="eyebrow">Authority Engine</p>
        <h1>Failures</h1>
        <p className="summary">Inspect provider errors and retry candidates from scheduled monitoring jobs.</p>
      </section>
      <section className="audit-list">
        {failures.length === 0 ? <p className="empty-state">No monitoring failures stored yet.</p> : failures.map((run) => <article className="section" key={run.id}><h2>{run.prompt.label}</h2><p>{run.error}</p></article>)}
      </section>
    </main>
  );
}
