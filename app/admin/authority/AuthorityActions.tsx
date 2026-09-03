"use client";

import { useState } from "react";

function authorizationError(status: number): string | null {
  if (status === 401) return "Your session is not signed in. Sign in as a Kodex administrator at /auth/login and try again.";
  if (status === 403) return "This account is not authorized. Sign in with a Kodex administrator account to run this action.";
  return null;
}

function errorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const value = (payload as Record<string, unknown>).error;
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof (value as Record<string, unknown>).message === "string") {
    return String((value as Record<string, unknown>).message);
  }
  return fallback;
}

export function AuthorityActionButton({ endpoint, label, method = "POST", body, className = "authority-primary" }: {
  endpoint: string;
  label: string;
  method?: "POST" | "PATCH";
  body?: Record<string, unknown>;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "running" | "done" | "failed">("idle");
  const [message, setMessage] = useState("");

  async function run() {
    setState("running");
    setMessage("");
    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "content-type": "application/json",
        },
        credentials: "same-origin",
        body: body ? JSON.stringify(body) : undefined,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setState("failed");
        setMessage(authorizationError(response.status) ?? errorMessage(payload, `Action failed with HTTP ${response.status}.`));
        return;
      }
      setState("done");
      setMessage("Completed successfully.");
      window.location.reload();
    } catch {
      setState("failed");
      setMessage("Could not reach the service. Check deployment health and try again.");
    }
  }

  return (
    <span className="authority-action-feedback">
      <button
        className={className}
        type="button"
        onClick={run}
        disabled={state === "running"}
        aria-live="polite"
        title="Protected action. It runs as the signed-in Kodex administrator."
      >
        {state === "running" ? "Running…" : state === "done" ? "Completed" : state === "failed" ? "Try again" : label}
      </button>
      {message ? <small role={state === "failed" ? "alert" : "status"}>{message}</small> : null}
    </span>
  );
}

export function OpportunityDecisionButton({ id, decision, canonicalId }: { id: string; decision: string; canonicalId?: string }) {
  const useCanonicalMerge = decision === "Merge" && canonicalId;
  const endpoint = useCanonicalMerge ? `/api/authority/opportunities/${id}/merge` : `/api/authority/opportunities/${id}/decision`;
  return <AuthorityActionButton endpoint={endpoint} label={`${decision} →`} body={useCanonicalMerge ? { canonicalId } : { decision }} className="authority-link-button" />;
}

export function NewOpportunityForm() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [framework, setFramework] = useState("EU AI Act");
  const [state, setState] = useState<"idle" | "saving" | "failed">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("saving");
    setMessage("");
    try {
      const response = await fetch("/api/authority/opportunities", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ query, framework, country: "DE", language: "en" }),
      });
      const payload = await response.json().catch(() => null);
      if (response.ok) {
        window.location.reload();
        return;
      }
      setState("failed");
      setMessage(authorizationError(response.status) ?? errorMessage(payload, `Could not save opportunity (HTTP ${response.status}).`));
    } catch {
      setState("failed");
      setMessage("Could not reach the service. Check deployment health and try again.");
    }
  }

  if (!open) return <button className="authority-primary" type="button" onClick={() => setOpen(true)} title="Create a new Authority opportunity">+ New opportunity</button>;

  return (
    <form className="authority-new-form" onSubmit={submit}>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Question or query" required minLength={8} />
      <select value={framework} onChange={(event) => setFramework(event.target.value)} aria-label="Compliance framework">
        <option>EU AI Act</option>
        <option>GDPR</option>
        <option>NIS2</option>
        <option>DORA</option>
        <option>CRA</option>
      </select>
      <button className="authority-primary" disabled={state === "saving"}>{state === "saving" ? "Saving…" : "Save"}</button>
      <button className="authority-link-button" type="button" onClick={() => setOpen(false)}>Cancel</button>
      {message ? <span role={state === "failed" ? "alert" : "status"}>{message}</span> : null}
    </form>
  );
}
