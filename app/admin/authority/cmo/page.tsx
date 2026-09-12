import type { Metadata } from "next";
import { requireAuthorityPage } from "@/lib/authority/auth";
import { listCmoThreads } from "@/lib/growth/cmo/store";
import CmoChat from "./CmoChat";

export const metadata: Metadata = { title: "Growth CMO", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CmoPage() {
  await requireAuthorityPage("/admin/authority/cmo");
  const threads = await listCmoThreads();

  return (
    <main className="authority-module">
      <header className="authority-topbar">
        <div>
          <p>Private Kodex System</p>
          <h1>Growth CMO</h1>
          <p>Ask for growth readouts, channel ideas, audit recommendations, signal scans and Brain updates. Write actions stay approval-only.</p>
        </div>
      </header>

      <CmoChat initialThreads={threads.items} storeConfigured={threads.configured} />
    </main>
  );
}
