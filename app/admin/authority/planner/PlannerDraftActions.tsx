"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Deliberately declared locally rather than imported from lib/growth/channels/store
// or lib/growth/context: this is a client component, and
// tests/server-module-boundaries.test.ts cannot distinguish a type-only
// import from a value import, so any import path that eventually reaches
// lib/seo/db.ts (even "import type") is forbidden here.
interface PlannerDraftSummary {
  id: string;
  channel: string;
  status: "draft" | "approved" | "scheduled" | "published" | "rejected";
  title: string | null;
  qualityPass: boolean | null;
  publishedUrl: string | null;
}

function statusLabel(status: PlannerDraftSummary["status"]): string {
  switch (status) {
    case "draft":
      return "Needs review";
    case "approved":
      return "Approved";
    case "scheduled":
      return "Scheduled";
    case "published":
      return "Published";
    case "rejected":
      return "Rejected";
    default:
      return status;
  }
}

export default function PlannerDraftActions({ draft }: { draft: PlannerDraftSummary }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "approved" | "rejected") {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/growth/channels/drafts/${draft.id}/decision`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ decision }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message ?? `Decision failed (HTTP ${response.status}).`);
      }
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Decision failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="authority-row-actions">
      <span className={`authority-pill status-${draft.status}`}>{statusLabel(draft.status)}</span>
      {draft.status === "draft" ? (
        <>
          <button type="button" className="authority-link-button" disabled={busy} onClick={() => decide("approved")}>
            Approve
          </button>
          <button type="button" className="authority-link-button" disabled={busy} onClick={() => decide("rejected")}>
            Reject
          </button>
        </>
      ) : null}
      {error ? <small role="alert">{error}</small> : null}
    </div>
  );
}
