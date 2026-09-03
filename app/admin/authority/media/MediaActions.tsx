"use client";

import { FormEvent, useState } from "react";
import type { MediaJob } from "@/lib/media/types";

function authorizationError(status: number): string | null {
  if (status === 401) return "Your session is not signed in. Sign in as a Kodex administrator at /auth/login and try again.";
  if (status === 403) return "This account is not authorized. Sign in with a Kodex administrator account to run this action.";
  return null;
}

export default function MediaActions({ initialJobs }: { initialJobs: MediaJob[] }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function createJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      title: form.get("title"),
      brief: form.get("brief"),
      kind: form.get("kind"),
      aspectRatio: form.get("aspectRatio"),
      sourceType: "authority-content",
    };
    const response = await fetch("/api/media/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(authorizationError(response.status) ?? data.error ?? "Media job could not be created.");
    else {
      setJobs((current) => [data.job, ...current.filter((job) => job.id !== data.job.id)]);
      setMessage(data.job.status === "pending_generation" ? "Media brief queued for generation." : "Generation job created.");
      event.currentTarget.reset();
    }
    setBusy(false);
  }

  async function refresh(id: string) {
    const response = await fetch(`/api/media/jobs/${id}`);
    const data = await response.json();
    if (response.ok && data.job) setJobs((current) => current.map((job) => job.id === id ? data.job : job));
  }

  async function decide(id: string, decision: "approve" | "reject") {
    const response = await fetch(`/api/media/jobs/${id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ decision }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(authorizationError(response.status) ?? data.error ?? "Decision failed.");
    setJobs((current) => current.map((job) => job.id === id ? data.job : job));
  }

  return (
    <div className="authority-stack">
      <form className="authority-card" onSubmit={createJob}>
        <div className="authority-card-head"><div><span className="authority-kicker">Create</span><h2>New media brief</h2></div></div>
        <label>Title<input name="title" required placeholder="EU AI Act enforcement explainer" /></label>
        <label>Brief<textarea name="brief" required rows={5} placeholder="What should the asset communicate, and which verified source/content is it based on?" /></label>
        <div className="authority-form-grid">
          <label>Format<select name="kind" defaultValue="image"><option value="image">Image</option><option value="video">Video</option></select></label>
          <label>Aspect ratio<select name="aspectRatio" defaultValue="1:1"><option>1:1</option><option>16:9</option><option>9:16</option><option>4:5</option></select></label>
        </div>
        <button className="authority-primary-button" disabled={busy}>{busy ? "Creating…" : "Create media job"}</button>
        {message ? <p role="alert">{message}</p> : null}
      </form>

      <div className="authority-stack">
        {jobs.length === 0 ? <div className="authority-card"><p>No media jobs yet.</p></div> : jobs.map((job) => (
          <article className="authority-card" key={job.id}>
            <div className="authority-card-head">
              <div><span className="authority-kicker">{job.kind} · {job.aspectRatio}</span><h2>{job.title}</h2></div>
              <span className="authority-pill">{job.status.replaceAll("_", " ")}</span>
            </div>
            <p>{job.brief}</p>
            <details><summary>Generation prompt</summary><pre style={{ whiteSpace: "pre-wrap" }}>{job.prompt}</pre></details>
            <p><strong>Provider:</strong> {job.provider}{job.model ? ` · ${job.model}` : ""}</p>
            {job.error ? <p role="alert">{job.error}</p> : null}
            {job.resultUrl ? (
              job.kind === "image"
                ? <img src={job.resultUrl} alt={`Generated draft for ${job.title}`} style={{ maxWidth: "100%", borderRadius: 16 }} />
                : <video src={job.resultUrl} controls style={{ maxWidth: "100%", borderRadius: 16 }} />
            ) : null}
            <div className="authority-actions-row">
              {['queued', 'processing'].includes(job.status) ? <button onClick={() => refresh(job.id)}>Refresh status</button> : null}
              {job.status === "completed" ? <button className="authority-primary-button" onClick={() => decide(job.id, "approve")}>Approve asset</button> : null}
              {!['approved', 'rejected'].includes(job.status) ? <button onClick={() => decide(job.id, "reject")}>Reject</button> : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
