import type { Metadata } from "next";
import ApprovalQueue from "./ApprovalQueue";
import { listLeadApprovalQueue } from "@/lib/seo/lead-work-packages";

export const metadata: Metadata = { title: "Lead Outreach Approval", robots: { index: false, follow: false } };

export default async function AuthorityOutreachPage() {
  const items = await listLeadApprovalQueue(80);
  const pending = items.filter((item) => item.decision === "pending_approval").length;
  const approved = items.filter((item) => item.decision === "approved").length;

  return (
    <main className="authority-module">
      <header className="authority-topbar">
        <div>
          <p>Private Kodex System</p>
          <h1>Lead outreach approval</h1>
          <p>Verified and qualified lead packages prepared autonomously. Approval changes queue state only; it never sends an external message automatically.</p>
        </div>
      </header>

      <section className="dashboard-grid" aria-label="Approval queue summary">
        <div className="metric-tile"><span>Pending approval</span><strong>{pending}</strong></div>
        <div className="metric-tile"><span>Approved packages</span><strong>{approved}</strong></div>
        <div className="metric-tile"><span>Total prepared</span><strong>{items.length}</strong></div>
      </section>

      <ApprovalQueue initialItems={items} />
    </main>
  );
}
