import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuthorityActionButton } from "../../AuthorityActions";
import { getKnowledgeSource } from "@/lib/authority/knowledge";

export const metadata: Metadata = { title: "Knowledge Source", robots: { index: false, follow: false } };

export default async function KnowledgeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const source = await getKnowledgeSource((await params).id);
  if (!source) notFound();
  return (
    <main className="authority-module">
      <header className="authority-topbar"><div><p>Knowledge</p><h1>{source.title}</h1></div><AuthorityActionButton endpoint={`/api/authority/knowledge/${source.id}`} method="PATCH" body={{ action: "check" }} label="Check source" /></header>
      <section className="authority-split">
        <article className="authority-panel"><h2>Provenance</h2><p>{source.source_organization}</p><p>{source.source_type}</p><p><a href={source.official_url}>{source.official_url}</a></p><p>Status: {source.verification_status}</p></article>
        <article className="authority-panel"><h2>Review</h2><div className="authority-action-row"><AuthorityActionButton endpoint={`/api/authority/knowledge/${source.id}`} method="PATCH" body={{ action: "verify", decision: "verified" }} label="Verify" /><AuthorityActionButton endpoint={`/api/authority/knowledge/${source.id}`} method="PATCH" body={{ action: "verify", decision: "rejected" }} label="Reject" className="authority-link-button" /></div></article>
      </section>
      <section className="authority-panel"><h2>Summary</h2><p>{source.summary ?? "No summary recorded."}</p></section>
    </main>
  );
}
