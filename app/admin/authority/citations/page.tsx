import type { Metadata } from "next";
import { getAuthorityDashboardData } from "@/lib/authority/monitoring";

export const metadata: Metadata = { title: "Authority Citations", robots: { index: false, follow: false } };

export default async function AuthorityCitationsPage() {
  const data = await getAuthorityDashboardData();
  const citations = data.runs.flatMap((run) => run.responses.flatMap((response) => response.citations.map((citation) => ({ ...citation, provider: response.provider }))));
  return (
    <main className="main authority-page">
      <section className="hero">
        <p className="eyebrow">Authority Engine</p>
        <h1>Citations</h1>
        <p className="summary">Inspect cited domains, URLs and Kodex citation positions.</p>
      </section>
      <section className="queue-table">
        <div className="queue-row queue-head"><span>Domain</span><span>URL</span><span>Provider</span><span>Position</span><span>Kodex</span></div>
        {citations.length === 0 ? <p className="empty-state">No citations stored yet.</p> : citations.map((citation) => (
          <article className="queue-row" key={`${citation.provider}-${citation.url}`}>
            <span>{citation.domain}</span><a href={citation.url}>{citation.url}</a><span>{citation.provider}</span><span>{citation.position}</span><span>{citation.citesKodex ? "Yes" : "No"}</span>
          </article>
        ))}
      </section>
    </main>
  );
}
