import type { Metadata } from "next";
import { AuthorityActionButton } from "../AuthorityActions";
import { getAuthorityDashboardData } from "@/lib/authority/monitoring";

export const metadata: Metadata = { title: "Authority Observatory", robots: { index: false, follow: false } };

export default async function ObservatoryPage() {
  const data = await getAuthorityDashboardData();
  return (
    <main className="authority-module">
      <header className="authority-topbar"><div><p>Private Kodex System</p><h1>Observatory</h1></div><AuthorityActionButton endpoint="/api/authority/monitoring/run" label="Run LLM monitoring" /></header>
      <section className="authority-metrics">
        <article><span>Visibility score</span><strong>{data.overview.visibilityScore}</strong></article>
        <article><span>Citation rate</span><strong>{data.overview.citationRate}%</strong></article>
        <article><span>Mention rate</span><strong>{data.overview.mentionRate}%</strong></article>
        <article><span>Providers</span><strong>{data.overview.providerCount}</strong></article>
      </section>
      <nav className="authority-tabs">
        <a href="/admin/authority/observatory/runs">Runs</a>
        <a href="/admin/authority/observatory/citations">Citations</a>
        <a href="/admin/authority/observatory/competitors">Competitors</a>
        <a href="/admin/authority/observatory/history">History</a>
        <a href="/admin/authority/observatory/failures">Failures</a>
      </nav>
    </main>
  );
}
