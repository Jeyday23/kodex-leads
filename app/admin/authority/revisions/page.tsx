import type { Metadata } from "next";
import { listRevisionPlans } from "@/lib/authority/autonomous-ranking";

export const metadata: Metadata = { title: "Authority Revisions", robots: { index: false, follow: false } };

export default async function AuthorityRevisionsPage() {
  const revisions = await listRevisionPlans();
  return (
    <main className="authority-module">
      <header className="authority-topbar"><div><p>Private Kodex System</p><h1>Revision planner</h1></div></header>
      <section className="authority-table">
        <div className="authority-table-head authority-editorial-row"><span>Trigger</span><span>Status</span><span>Risk</span><span>Created</span></div>
        {revisions.map((plan) => (
          <article className="authority-editorial-row" key={plan.id}><span>{plan.trigger_type}</span><span>{plan.status}</span><span>{plan.risk_level}</span><span>{plan.created_at}</span></article>
        ))}
      </section>
    </main>
  );
}
