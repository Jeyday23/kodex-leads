import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuthorityActionButton } from "../../AuthorityActions";
import { getContentAsset } from "@/lib/authority/autonomous-ranking";

export const metadata: Metadata = { title: "Authority Content Detail", robots: { index: false, follow: false } };

export default async function AuthorityContentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const asset = await getContentAsset((await params).id);
  if (!asset) notFound();
  return (
    <main className="authority-module">
      <header className="authority-topbar">
        <div><p>Content asset</p><h1>{asset.title}</h1></div>
        <div className="authority-action-row">
          <AuthorityActionButton endpoint={`/api/authority/content/${asset.id}/generate`} label="Generate" />
          <AuthorityActionButton endpoint={`/api/authority/content/${asset.id}/validate`} label="Validate" />
          <AuthorityActionButton endpoint={`/api/authority/content/${asset.id}/approve`} label="Approve" />
          <AuthorityActionButton endpoint={`/api/authority/content/${asset.id}/publish`} label="Publish" />
        </div>
      </header>
      <section className="authority-split">
        <article className="authority-panel">
          <h2>Asset</h2>
          <p>Status: <strong>{asset.status}</strong></p>
          <p>Risk: <strong>{asset.riskLevel}</strong></p>
          <p>Route: {asset.routePath ? <a href={asset.routePath}>{asset.routePath}</a> : "Not published"}</p>
          <p>Approval required: {asset.approvalRequired ? "yes" : "no"}</p>
        </article>
        <article className="authority-panel">
          <h2>Operations</h2>
          <div className="authority-action-row">
            <AuthorityActionButton endpoint={`/api/authority/content/${asset.id}/audit`} label="Audit" />
            <AuthorityActionButton endpoint={`/api/authority/content/${asset.id}/revise`} label="Revise" />
            <AuthorityActionButton endpoint={`/api/authority/content/${asset.id}/rollback`} label="Rollback" className="authority-link-button" />
          </div>
        </article>
      </section>
      <section className="authority-panel">
        <h2>Versions</h2>
        <pre>{JSON.stringify(asset.versions, null, 2)}</pre>
      </section>
      <section className="authority-panel">
        <h2>Claim ledger</h2>
        <pre>{JSON.stringify(asset.claims, null, 2)}</pre>
      </section>
      <section className="authority-panel">
        <h2>Quality gates and publication events</h2>
        <pre>{JSON.stringify({ gates: asset.gates, events: asset.events }, null, 2)}</pre>
      </section>
    </main>
  );
}
