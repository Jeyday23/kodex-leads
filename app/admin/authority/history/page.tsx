import type { Metadata } from "next";
import { getAuthorityDashboardData } from "@/lib/authority/monitoring";

export const metadata: Metadata = { title: "Authority History", robots: { index: false, follow: false } };

export default async function AuthorityHistoryPage() {
  const data = await getAuthorityDashboardData();
  return (
    <main className="main authority-page">
      <section className="hero">
        <p className="eyebrow">Authority Engine</p>
        <h1>History</h1>
        <p className="summary">Track visibility, citation rate and mention-rate movement over time.</p>
      </section>
      <section className="dashboard-grid">
        <div className="metric-tile"><span>Visibility</span><strong>{data.overview.visibilityScore}</strong></div>
        <div className="metric-tile"><span>Citation rate</span><strong>{data.overview.citationRate}%</strong></div>
        <div className="metric-tile"><span>Mention rate</span><strong>{data.overview.mentionRate}%</strong></div>
        <div className="metric-tile"><span>Movement</span><strong>{data.overview.recentMovement}</strong></div>
      </section>
    </main>
  );
}
