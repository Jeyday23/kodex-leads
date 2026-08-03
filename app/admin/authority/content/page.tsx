import type { Metadata } from "next";
import { AuthorityActionButton } from "../AuthorityActions";
import { listContentAssets } from "@/lib/authority/autonomous-ranking";

export const metadata: Metadata = { title: "Authority Content", robots: { index: false, follow: false } };

export default async function AuthorityContentPage() {
  const assets = await listContentAssets(50);
  return (
    <main className="authority-module">
      <header className="authority-topbar">
        <div><p>Private Kodex System</p><h1>Content assets</h1></div>
        <AuthorityActionButton endpoint="/api/authority/autopilot/run" label="Run autopilot" />
      </header>
      <section className="authority-heading">
        <h2>Autonomous content pipeline</h2>
        <span>Versioned assets, claim ledgers, quality gates, approvals, publication and rollback.</span>
      </section>
      <section className="authority-table">
        <div className="authority-table-head authority-content-row"><span>Asset</span><span>Type</span><span>Status</span><span>Risk</span><span>Route</span></div>
        {assets.map((asset) => (
          <article className="authority-content-row" key={asset.id}>
            <a href={`/admin/authority/content/${asset.id}`}><strong>{asset.title}</strong><small>{asset.targetQuery}</small></a>
            <span>{asset.contentType}</span>
            <span>{asset.status}</span>
            <span>{asset.riskLevel}{asset.approvalRequired ? " / approval" : ""}</span>
            <span>{asset.routePath ?? "Not published"}</span>
          </article>
        ))}
      </section>
    </main>
  );
}
