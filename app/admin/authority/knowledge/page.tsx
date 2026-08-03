import type { Metadata } from "next";
import { listKnowledgeSources } from "@/lib/authority/knowledge";

export const metadata: Metadata = { title: "Authority Knowledge", robots: { index: false, follow: false } };

export default async function KnowledgePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const sources = await listKnowledgeSources({ framework: params.framework, search: params.search });
  return (
    <main className="authority-module">
      <header className="authority-topbar"><div><p>Private Kodex System</p><h1>Knowledge</h1></div><a className="authority-primary" href="/admin/authority/opportunities">Research opportunities</a></header>
      <section className="authority-heading"><h2>Verified source library</h2><span>Official and reviewed compliance sources with provenance and version history.</span></section>
      <form className="authority-filters"><input name="search" placeholder="Search sources" defaultValue={params.search ?? ""} /><select name="framework" defaultValue={params.framework ?? ""}><option value="">All frameworks</option><option>EU AI Act</option><option>GDPR</option><option>NIS2</option></select><button type="submit">Apply</button></form>
      <section className="authority-table">
        <div className="authority-table-head authority-knowledge-row"><span>Source</span><span>Organization</span><span>Type</span><span>Framework</span><span>Status</span><span>Last checked</span></div>
        {sources.length === 0 ? <p className="authority-empty">No knowledge sources yet. Use Research on an opportunity or import official sources.</p> : sources.map((source) => (
          <article className="authority-knowledge-row" key={source.id}>
            <a href={`/admin/authority/knowledge/${source.id}`}><strong>{source.title}</strong><small>{source.official_url}</small></a>
            <span>{source.source_organization}</span><span>{source.source_type}</span><span>{source.framework}</span><span>{source.verification_status}</span><span>{source.last_checked_at ? new Date(source.last_checked_at).toLocaleDateString() : "Not checked"}</span>
          </article>
        ))}
      </section>
    </main>
  );
}
