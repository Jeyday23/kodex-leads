import type { Metadata } from "next";
import { listCompetitorNames } from "@/lib/authority/store";

export const metadata: Metadata = { title: "Authority Competitors", robots: { index: false, follow: false } };

export default async function AuthorityCompetitorsPage() {
  const competitors = await listCompetitorNames();
  return (
    <main className="main authority-page">
      <section className="hero">
        <p className="eyebrow">Authority Engine</p>
        <h1>Competitors</h1>
        <p className="summary">Compare Kodex against named competitors in answer-engine responses.</p>
      </section>
      <section className="lead-cards">
        {competitors.map((competitor) => <article className="lead-card" key={competitor}><strong>{competitor}</strong><p>Tracked for mentions and citation counts.</p></article>)}
      </section>
    </main>
  );
}
