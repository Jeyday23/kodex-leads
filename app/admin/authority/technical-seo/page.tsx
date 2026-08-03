import type { Metadata } from "next";
import { AuthorityActionButton } from "../AuthorityActions";
import { listTechnicalSeoIssues } from "@/lib/authority/autonomous-ranking";

export const metadata: Metadata = { title: "Authority Technical SEO", robots: { index: false, follow: false } };

export default async function AuthorityTechnicalSeoPage() {
  const issues = await listTechnicalSeoIssues();
  return (
    <main className="authority-module">
      <header className="authority-topbar"><div><p>Private Kodex System</p><h1>Technical SEO</h1></div><AuthorityActionButton endpoint="/api/authority/technical-seo/repair" label="Run repair" /></header>
      <section className="authority-panel"><h2>Open issues</h2><pre>{JSON.stringify(issues, null, 2)}</pre></section>
    </main>
  );
}
