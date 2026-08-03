import type { Metadata } from "next";
import { getAutopilotStatus } from "@/lib/authority/autonomous-ranking";

export const metadata: Metadata = { title: "Authority Publishing Policy", robots: { index: false, follow: false } };

export default async function AuthorityPublishingPolicyPage() {
  const status = await getAutopilotStatus();
  return (
    <main className="authority-module">
      <header className="authority-topbar"><div><p>Settings</p><h1>Publishing policy</h1></div></header>
      <section className="authority-panel">
        <h2>Risk-based policy</h2>
        <p>Mode: <strong>{status.mode}</strong></p>
        <p>Low-risk metadata, internal link and verified knowledge additions may publish in guarded mode. New legal interpretation, penalty/deadline language, product capability claims and competitor comparisons require admin approval.</p>
        <p>Never allowed: fake backlinks, fabricated citations, fake engagement, fake testimonials, cloaking, hidden text, doorway pages or invented demand.</p>
      </section>
    </main>
  );
}
