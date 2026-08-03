import type { Metadata } from "next";
import { listEditorialItems } from "@/lib/authority/editorial";

export const metadata: Metadata = { title: "Authority Editorial", robots: { index: false, follow: false } };

export default async function EditorialPage() {
  const items = await listEditorialItems();
  return (
    <main className="authority-module">
      <header className="authority-topbar"><div><p>Private Kodex System</p><h1>Editorial</h1></div><a className="authority-primary" href="/admin/authority/opportunities">Open opportunities</a></header>
      <section className="authority-heading"><h2>Editorial control</h2><span>Briefs, drafts, reviews and approval gates created from opportunity decisions.</span></section>
      <section className="authority-table">
        <div className="authority-table-head authority-editorial-row"><span>Title</span><span>Type</span><span>Framework</span><span>Audience</span><span>Status</span><span>Updated</span></div>
        {items.length === 0 ? <p className="authority-empty">No editorial items yet. Use Build or Expand on an opportunity.</p> : items.map((item) => (
          <article className="authority-editorial-row" key={item.id}>
            <a href={`/admin/authority/editorial/${item.id}`}><strong>{item.title}</strong><small>{item.primary_query}</small></a>
            <span>{item.content_type}</span><span>{item.framework}</span><span>{item.target_audience}</span><span>{item.status}</span><span>{new Date(item.updated_at).toLocaleDateString()}</span>
          </article>
        ))}
      </section>
    </main>
  );
}
