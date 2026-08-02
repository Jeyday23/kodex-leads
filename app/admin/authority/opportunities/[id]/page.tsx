import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OpportunityDecisionButton } from "../../AuthorityActions";
import { getOpportunity } from "@/lib/authority/opportunities";

export const metadata: Metadata = { title: "Authority Opportunity", robots: { index: false, follow: false } };

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const opportunity = await getOpportunity(id);
  if (!opportunity) notFound();

  return (
    <main className="authority-module">
      <header className="authority-topbar"><div><p>Opportunity</p><h1>{opportunity.query}</h1></div><a className="authority-primary" href="/admin/authority/opportunities">Back to queue</a></header>
      <section className="authority-split">
        <article className="authority-panel">
          <h2>Scoring</h2>
          <p>Priority score: <strong>{opportunity.priorityScore}</strong></p>
          <p>Recommended decision: <strong>{opportunity.recommendedDecision}</strong></p>
          <p>Demand: <strong>{opportunity.searchDemandLabel}</strong> ({opportunity.demandIntegrity}, {opportunity.demandSource})</p>
        </article>
        <article className="authority-panel">
          <h2>Actions</h2>
          <div className="authority-action-row">
            {["Build", "Expand", "Merge", "Research", "Ignore"].map((decision) => <OpportunityDecisionButton id={opportunity.id} decision={decision} key={decision} />)}
          </div>
        </article>
      </section>
      <section className="authority-panel">
        <h2>Provenance</h2>
        <p>{opportunity.description}</p>
        <p>Source: {opportunity.source}</p>
        <p>Framework: {opportunity.framework}</p>
        <p>Country / language: {opportunity.country} / {opportunity.language}</p>
      </section>
    </main>
  );
}
