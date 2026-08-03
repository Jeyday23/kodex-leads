import type { Metadata } from "next";
import { listPublications } from "@/lib/authority/autonomous-ranking";

export const metadata: Metadata = { title: "Authority Publications", robots: { index: false, follow: false } };

export default async function AuthorityPublicationsPage() {
  const publications = await listPublications();
  return (
    <main className="authority-module">
      <header className="authority-topbar"><div><p>Private Kodex System</p><h1>Publications</h1></div></header>
      <section className="authority-table">
        <div className="authority-table-head authority-editorial-row"><span>Event</span><span>Route</span><span>Status</span><span>Created</span></div>
        {publications.map((event) => (
          <article className="authority-editorial-row" key={event.id}><span>{event.event_type}</span><span>{event.route_path ?? "n/a"}</span><span>{event.http_status ?? "pending"}</span><span>{event.created_at}</span></article>
        ))}
      </section>
    </main>
  );
}
