import type { Metadata } from "next";
import { AuthorityActionButton, NewOpportunityForm, OpportunityDecisionButton } from "../AuthorityActions";
import { listOpportunities } from "@/lib/authority/opportunities";

export const metadata: Metadata = { title: "Authority Opportunities", robots: { index: false, follow: false } };

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const result = await listOpportunities({
    search: params.search,
    framework: params.framework,
    intent: params.intent,
    country: params.country,
    language: params.language,
    status: params.status,
    source: params.source,
    sort: params.sort,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    limit: 50,
  });

  return (
    <main className="authority-module">
      <header className="authority-topbar">
        <div><p>Private Kodex System</p><h1>Opportunities</h1></div>
        <div className="authority-topbar-actions">
          <a className="authority-icon-button" href="?search=" aria-label="Search">⌕</a>
          <a className="authority-icon-button" href="/admin/authority/command" aria-label="Alerts">○</a>
          <AuthorityActionButton endpoint="/api/authority/opportunities/discover" label="Run discovery" />
          <NewOpportunityForm />
        </div>
      </header>

      <section className="authority-heading">
        <h2>Opportunity intelligence</h2>
        <span>Prioritized questions tied to buyer intent, Kodex services and topic authority.</span>
      </section>

      <form className="authority-filters">
        <input name="search" placeholder="Search opportunities" defaultValue={params.search ?? ""} />
        <select name="framework" defaultValue={params.framework ?? ""}><option value="">All frameworks</option><option>EU AI Act</option><option>GDPR</option><option>NIS2</option></select>
        <select name="intent" defaultValue={params.intent ?? ""}><option value="">All intents</option><option>Commercial</option><option>Decision</option><option>Risk</option><option>Implementation</option><option>Research</option></select>
        <select name="country" defaultValue={params.country ?? ""}><option value="">All countries</option><option>DE</option><option>EU</option></select>
        <select name="language" defaultValue={params.language ?? ""}><option value="">All languages</option><option>en</option><option>de</option></select>
        <select name="status" defaultValue={params.status ?? ""}><option value="">All statuses</option><option>active</option><option>in_progress</option><option>merged</option><option>ignored</option></select>
        <select name="source" defaultValue={params.source ?? ""}><option value="">All sources</option><option value="configured_topic">Configured topics</option><option value="indexed_content">Indexed content</option><option value="manual">Manual</option></select>
        <input name="dateFrom" type="date" defaultValue={params.dateFrom ?? ""} aria-label="Date from" />
        <select name="sort" defaultValue={params.sort ?? "priority-high"}><option value="priority-high">Priority: High first</option><option value="priority-low">Priority: Low first</option></select>
        <button type="submit">Apply</button>
      </form>

      <section className="authority-table">
        <div className="authority-table-head authority-opportunity-row">
          <span>Question / Query</span><span>Cluster</span><span>Intent</span><span>Demand signal</span><span>Priority</span><span>Decision</span><span>Last seen</span><span>Status</span>
        </div>
        {result.items.length === 0 ? (
          <p className="authority-empty">{result.databaseConfigured ? "No opportunities found. Run discovery to populate the queue." : "Supabase is not configured, so opportunities cannot be loaded."}</p>
        ) : result.items.map((item) => (
          <article className="authority-opportunity-row" key={item.id}>
            <a href={`/admin/authority/opportunities/${item.id}`}><strong>{item.query}</strong><small>{item.demandIntegrity} demand from {item.demandSource}</small></a>
            <span className="authority-pill">{item.topicCluster}</span>
            <span>{item.intent}</span>
            <span>{item.searchDemandValue ? item.searchDemandValue : item.searchDemandLabel}</span>
            <span><strong>{item.priorityScore}</strong><i style={{ width: `${item.priorityScore}%` }} /></span>
            <span className="authority-row-actions"><OpportunityDecisionButton id={item.id} decision={item.recommendedDecision} /><OpportunityDecisionButton id={item.id} decision="Archive" /></span>
            <span>{new Date(item.lastSeenAt).toLocaleDateString()}</span>
            <span>{item.status}</span>
          </article>
        ))}
      </section>
    </main>
  );
}
