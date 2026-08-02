"use client";

import { useState } from "react";

export function AuthorityActionButton({ endpoint, label, method = "POST", body, className = "authority-primary" }: {
  endpoint: string;
  label: string;
  method?: "POST" | "PATCH";
  body?: Record<string, unknown>;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "running" | "done" | "failed">("idle");

  async function run() {
    setState("running");
    const response = await fetch(endpoint, {
      method,
      headers: { "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    setState(response.ok ? "done" : "failed");
    if (response.ok) window.location.reload();
  }

  return (
    <button className={className} type="button" onClick={run} disabled={state === "running"} aria-live="polite">
      {state === "running" ? "Running..." : state === "done" ? "Completed" : state === "failed" ? "Failed" : label}
    </button>
  );
}

export function OpportunityDecisionButton({ id, decision, canonicalId }: { id: string; decision: string; canonicalId?: string }) {
  const endpoint = decision === "Merge" ? `/api/authority/opportunities/${id}/merge` : `/api/authority/opportunities/${id}/decision`;
  return <AuthorityActionButton endpoint={endpoint} label={`${decision} →`} body={decision === "Merge" ? { canonicalId } : { decision }} className="authority-link-button" />;
}

export function NewOpportunityForm() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [framework, setFramework] = useState("EU AI Act");
  const [state, setState] = useState<"idle" | "saving" | "failed">("idle");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("saving");
    const response = await fetch("/api/authority/opportunities", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, framework, country: "DE", language: "en" }),
    });
    if (response.ok) window.location.reload();
    else setState("failed");
  }

  if (!open) return <button className="authority-primary" type="button" onClick={() => setOpen(true)}>+ New opportunity</button>;

  return (
    <form className="authority-new-form" onSubmit={submit}>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Question or query" required minLength={8} />
      <select value={framework} onChange={(event) => setFramework(event.target.value)}>
        <option>EU AI Act</option>
        <option>GDPR</option>
        <option>NIS2</option>
        <option>DORA</option>
        <option>CRA</option>
      </select>
      <button className="authority-primary" disabled={state === "saving"}>{state === "saving" ? "Saving..." : "Save"}</button>
      <button className="authority-link-button" type="button" onClick={() => setOpen(false)}>Cancel</button>
      {state === "failed" ? <span>Could not save.</span> : null}
    </form>
  );
}
