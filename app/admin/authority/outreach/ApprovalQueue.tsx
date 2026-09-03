"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface QueueItem {
  packageId: string;
  companyName: string;
  sourceUrl: string;
  evidenceSummary: string;
  qualificationScore: number;
  qualificationReasons: string[];
  regulatoryFramework: string | null;
  triggerCategory: string | null;
  fineAmount: string | null;
  decisionMaker: {
    name: string | null;
    title: string | null;
    email: string | null;
    source: string | null;
  };
  researchBrief: {
    whyNow: string;
    evidence: string;
    kodexFit: string;
    recommendedApproach: string;
    cautions: string[];
  };
  outreachDraft: { subject: string; body: string };
  decision: "pending_approval" | "approved" | "rejected";
  decisionBy: string | null;
  decisionAt: string | null;
  createdAt: string;
}

export default function ApprovalQueue({ initialItems }: { initialItems: QueueItem[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending_approval" | "all">("pending_approval");

  const items = useMemo(
    () => filter === "all" ? initialItems : initialItems.filter((item) => item.decision === "pending_approval"),
    [filter, initialItems],
  );

  async function decide(packageId: string, decision: "approved" | "rejected") {
    setError(null);
    setBusy(packageId);
    try {
      const response = await fetch(`/api/leads/outreach/${encodeURIComponent(packageId)}/decision`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ decision }),
      });
      const payload = await response.json().catch(() => null);
      if (response.status === 401) {
        throw new Error("Your session is not signed in. Sign in as a Kodex administrator at /auth/login and try again.");
      }
      if (response.status === 403) {
        throw new Error("This account is not authorized. Sign in with a Kodex administrator account to approve or reject packages.");
      }
      if (!response.ok) throw new Error(payload?.error ?? "Approval update failed.");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Approval update failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="authority-stack">
      <section className="authority-panel">
        <div className="result-heading">
          <div>
            <p className="eyebrow">Founder control</p>
            <h2>Outreach approvals</h2>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="secondary-link" onClick={() => setFilter("pending_approval")}>Pending</button>
            <button type="button" className="secondary-link" onClick={() => setFilter("all")}>All</button>
          </div>
        </div>
        <p>Discovery, verification, qualification, enrichment and drafting are autonomous. External sending is not.</p>
        <p>Approvals and rejections are recorded against your signed-in administrator account.</p>
        {error ? <p role="alert" style={{ marginTop: 10 }}>{error}</p> : null}
      </section>

      {items.length === 0 ? (
        <section className="authority-panel">
          <h2>No packages in this view</h2>
          <p className="authority-empty">The next qualified, re-verified lead will appear here automatically.</p>
        </section>
      ) : items.map((item) => (
        <article className="authority-panel" key={item.packageId}>
          <div className="result-heading">
            <div>
              <p className="eyebrow">{item.triggerCategory ?? "qualified lead"}</p>
              <h2>{item.companyName}</h2>
            </div>
            <strong>{item.qualificationScore} / 100</strong>
          </div>

          <dl className="authority-detail-grid">
            <div><dt>Status</dt><dd>{item.decision.replaceAll("_", " ")}</dd></div>
            <div><dt>Framework</dt><dd>{item.regulatoryFramework ?? "Needs classification"}</dd></div>
            <div><dt>Decision maker</dt><dd>{item.decisionMaker.name ?? "Name unresolved"}</dd></div>
            <div><dt>Role</dt><dd>{item.decisionMaker.title ?? "Compliance / Privacy / Legal"}</dd></div>
            <div><dt>Email</dt><dd>{item.decisionMaker.email ?? "Not enriched"}</dd></div>
            {item.fineAmount ? <div><dt>Published fine</dt><dd>{item.fineAmount}</dd></div> : null}
          </dl>

          <div className="kx-lead-notice">
            <strong>Evidence verified</strong>
            <p>{item.evidenceSummary}</p>
            <a href={item.sourceUrl} target="_blank" rel="noreferrer">Open source ↗</a>
          </div>

          <div className="authority-stack">
            <div>
              <h3>Why now</h3>
              <p>{item.researchBrief.whyNow}</p>
            </div>
            <div>
              <h3>Kodex fit</h3>
              <p>{item.researchBrief.kodexFit}</p>
            </div>
            <div>
              <h3>Recommended approach</h3>
              <p>{item.researchBrief.recommendedApproach}</p>
            </div>
          </div>

          <details style={{ marginTop: 16 }}>
            <summary><strong>Prepared outreach draft</strong></summary>
            <p><strong>Subject:</strong> {item.outreachDraft.subject}</p>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{item.outreachDraft.body}</pre>
          </details>

          {item.decision === "pending_approval" ? (
            <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
              <button type="button" disabled={busy === item.packageId} onClick={() => decide(item.packageId, "approved")}>Approve package</button>
              <button type="button" className="secondary-link" disabled={busy === item.packageId} onClick={() => decide(item.packageId, "rejected")}>Reject</button>
            </div>
          ) : (
            <p style={{ marginTop: 18 }}>Decision recorded {item.decisionAt ? new Date(item.decisionAt).toLocaleString() : ""}. No message was sent automatically.</p>
          )}
        </article>
      ))}
    </div>
  );
}
