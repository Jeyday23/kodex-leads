import type { Metadata } from "next";
import { listOutreachOpportunities } from "@/lib/authority/autonomous-ranking";

export const metadata: Metadata = { title: "Authority Outreach", robots: { index: false, follow: false } };

export default async function AuthorityOutreachPage() {
  const items = await listOutreachOpportunities();
  return (
    <main className="authority-module">
      <header className="authority-topbar"><div><p>Private Kodex System</p><h1>Authority outreach queue</h1></div></header>
      <section className="authority-panel">
        <h2>Approved-safe queue</h2>
        <p className="authority-empty">The engine may identify authority opportunities and draft outreach. Sending remains approval-gated.</p>
        <pre>{JSON.stringify(items, null, 2)}</pre>
      </section>
    </main>
  );
}
