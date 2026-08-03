import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuthorityActionButton } from "../../AuthorityActions";
import { getEditorialItem } from "@/lib/authority/editorial";

export const metadata: Metadata = { title: "Editorial Item", robots: { index: false, follow: false } };

export default async function EditorialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const item = await getEditorialItem((await params).id);
  if (!item) notFound();
  return (
    <main className="authority-module">
      <header className="authority-topbar"><div><p>Editorial</p><h1>{item.title}</h1></div><AuthorityActionButton endpoint={`/api/authority/editorial/${item.id}`} method="PATCH" body={{ action: "generate_draft" }} label="Generate draft" /></header>
      <section className="authority-split">
        <article className="authority-panel"><h2>Brief</h2><pre>{JSON.stringify(item.authority_editorial_briefs?.[0]?.brief ?? {}, null, 2)}</pre></article>
        <article className="authority-panel"><h2>Workflow</h2><p>Status: {item.status}</p><div className="authority-action-row">{["researching", "legal review", "compliance review", "approved", "ready for publication", "rejected", "archived"].map((status) => <AuthorityActionButton key={status} endpoint={`/api/authority/editorial/${item.id}`} method="PATCH" body={{ action: "status", status }} label={status} className="authority-link-button" />)}</div></article>
      </section>
      <section className="authority-panel"><h2>Draft</h2><pre>{item.draft_content ?? "No draft generated yet."}</pre></section>
    </main>
  );
}
