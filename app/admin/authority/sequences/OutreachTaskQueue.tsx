"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Local structural types only, per the ruling that a client component must
// never import types from a module reaching lib/seo/db.ts (even type-only),
// since the module-boundary test cannot distinguish type-only imports.
interface QueueTask {
  id: string;
  enrollmentId: string;
  stepId: string | null;
  kind: "visit" | "like" | "connect" | "message" | "email";
  draftCopy: string | null;
  status: "queued" | "approved" | "done" | "skipped";
  dueAt: string | null;
}

const SEND_KINDS = new Set(["email", "message", "connect"]);

export default function OutreachTaskQueue({ initialTasks }: { initialTasks: QueueTask[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recipientEmail, setRecipientEmail] = useState<Record<string, string>>({});

  async function approve(task: QueueTask, decision: "approved" | "rejected") {
    if (!task.stepId) {
      setError("This task has no linked sequence step to approve.");
      return;
    }
    setBusy(task.id);
    setError(null);
    try {
      const response = await fetch(`/api/growth/enrollments/${encodeURIComponent(task.enrollmentId)}/decision`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ stepId: task.stepId, decision, taskId: task.id }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message ?? `Decision failed with HTTP ${response.status}.`);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Decision failed.");
    } finally {
      setBusy(null);
    }
  }

  async function markDone(task: QueueTask) {
    setBusy(task.id);
    setError(null);
    try {
      const response = await fetch(`/api/growth/tasks/${encodeURIComponent(task.id)}/done`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(task.kind === "email" ? { recipientEmail: recipientEmail[task.id] || undefined } : {}),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message ?? `Could not mark task done (HTTP ${response.status}).`);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not mark task done.");
    } finally {
      setBusy(null);
    }
  }

  if (initialTasks.length === 0) {
    return (
      <section className="authority-panel">
        <h2>No outreach tasks</h2>
        <p className="authority-empty">Nothing queued right now. Enroll a lead in a sequence to create the first task.</p>
      </section>
    );
  }

  return (
    <div className="authority-stack">
      {error ? <p role="alert">{error}</p> : null}
      {initialTasks.map((task) => (
        <article className="authority-panel" key={task.id}>
          <div className="result-heading">
            <div>
              <p className="eyebrow">{task.kind}</p>
              <h3>Status: {task.status}</h3>
            </div>
          </div>

          {task.draftCopy ? (
            <details>
              <summary><strong>Drafted copy</strong></summary>
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{task.draftCopy}</pre>
            </details>
          ) : (
            <p>Manual LinkedIn action - no copy to approve.</p>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
            {task.status === "queued" && SEND_KINDS.has(task.kind) ? (
              <>
                <button type="button" disabled={busy === task.id} onClick={() => approve(task, "approved")}>Approve</button>
                <button type="button" className="secondary-link" disabled={busy === task.id} onClick={() => approve(task, "rejected")}>Reject</button>
              </>
            ) : null}

            {(task.status === "approved" || (task.status === "queued" && !SEND_KINDS.has(task.kind))) ? (
              <>
                {task.kind === "email" ? (
                  <input
                    type="email"
                    placeholder="Recipient email"
                    value={recipientEmail[task.id] ?? ""}
                    onChange={(event) => setRecipientEmail((prev) => ({ ...prev, [task.id]: event.target.value }))}
                  />
                ) : null}
                <button type="button" disabled={busy === task.id} onClick={() => markDone(task)}>Mark done</button>
              </>
            ) : null}

            {task.status === "done" || task.status === "skipped" ? <p>No further action needed.</p> : null}
          </div>
        </article>
      ))}
    </div>
  );
}
