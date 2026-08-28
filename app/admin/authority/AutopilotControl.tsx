"use client";

import { useState } from "react";

type Mode = "off" | "draft_only" | "guarded" | "controlled";
type ControlState = "idle" | "saving" | "running" | "testing" | "done" | "failed";
type PreflightCheck = { id: string; label: string; ok: boolean; required: boolean; detail: string };

const labels: Record<Mode, { title: string; detail: string }> = {
  off: { title: "Off", detail: "No autonomous discovery, drafting or publishing runs." },
  draft_only: { title: "Draft only", detail: "Find opportunities and draft content, but never publish automatically." },
  guarded: { title: "Guarded", detail: "May publish only low-risk, fully verified content that does not require approval." },
  controlled: { title: "Controlled", detail: "Runs the full pipeline within limits, but still blocks approval-required or unsafe content." },
};

function responseError(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const error = (payload as Record<string, unknown>).error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && typeof (error as Record<string, unknown>).message === "string") {
    return String((error as Record<string, unknown>).message);
  }
  return fallback;
}

export function AutopilotControl({ currentMode }: { currentMode: Mode }) {
  const [mode, setMode] = useState<Mode>(currentMode);
  const [secret, setSecret] = useState("");
  const [state, setState] = useState<ControlState>("idle");
  const [message, setMessage] = useState("");
  const [preflightChecks, setPreflightChecks] = useState<PreflightCheck[]>([]);

  async function saveMode(nextMode: Mode) {
    if (!secret.trim()) {
      setState("failed");
      setMessage("Enter the private control key first.");
      return;
    }
    setState("saving");
    setMessage("");
    const response = await fetch("/api/authority/autopilot/status", {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-kodex-control-secret": secret },
      body: JSON.stringify({ mode: nextMode }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setState("failed");
      setMessage(responseError(payload, "Could not change autonomy mode."));
      return;
    }
    setMode(nextMode);
    setState("done");
    setMessage(`Autonomy mode changed to ${labels[nextMode].title}.`);
  }

  async function runNow() {
    if (!secret.trim()) {
      setState("failed");
      setMessage("Enter the private control key first.");
      return;
    }
    if (mode === "off") {
      setState("failed");
      setMessage("Autonomy is OFF. Choose another mode before running.");
      return;
    }
    setState("running");
    setMessage("");
    const response = await fetch("/api/authority/autopilot/run", {
      method: "POST",
      headers: { "content-type": "application/json", "x-kodex-control-secret": secret },
      body: JSON.stringify({}),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setState("failed");
      setMessage(responseError(payload, "Autopilot run failed."));
      return;
    }
    setState("done");
    setMessage("Autonomous run completed. Refreshing workspace data…");
    window.location.reload();
  }

  async function runSafetyTest() {
    if (!secret.trim()) {
      setState("failed");
      setMessage("Enter the private control key first.");
      return;
    }
    setState("testing");
    setMessage("");
    setPreflightChecks([]);
    const response = await fetch("/api/authority/autopilot/run", {
      method: "POST",
      headers: { "content-type": "application/json", "x-kodex-control-secret": secret },
      body: JSON.stringify({ preflight: true }),
    });
    const payload = await response.json().catch(() => null) as { data?: { ok?: boolean; checks?: PreflightCheck[] } } | null;
    if (!response.ok) {
      setState("failed");
      setMessage(responseError(payload, "Preflight failed."));
      return;
    }
    const checks = Array.isArray(payload?.data?.checks) ? payload.data.checks : [];
    setPreflightChecks(checks);
    const ready = payload?.data?.ok === true;
    setState(ready ? "done" : "failed");
    setMessage(ready
      ? "Non-publishing preflight passed. Required controls are ready."
      : "Preflight completed with blocking configuration issues. Review the checks below.");
  }

  const busy = state === "saving" || state === "running" || state === "testing";

  return (
    <section className="authority-panel">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <p className="eyebrow">Private control</p>
          <h2>Autonomy switch</h2>
          <p className="authority-empty">The dashboard stays public. Automation controls require your private Render control key.</p>
        </div>
        <span className="authority-link-button" aria-label={`Current mode ${mode}`}>MODE: {mode.toUpperCase()}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 20 }}>
        {(Object.keys(labels) as Mode[]).map((item) => (
          <button
            key={item}
            type="button"
            className={item === mode ? "authority-primary" : "authority-link-button"}
            onClick={() => saveMode(item)}
            disabled={busy}
            style={{ textAlign: "left", minHeight: 118 }}
          >
            <strong style={{ display: "block", marginBottom: 8 }}>{labels[item].title}</strong>
            <span style={{ display: "block", opacity: 0.78, lineHeight: 1.45 }}>{labels[item].detail}</span>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 20 }}>
        <input
          type="password"
          value={secret}
          onChange={(event) => setSecret(event.target.value)}
          placeholder="Private control key"
          autoComplete="off"
          aria-label="Private autonomy control key"
          style={{ minWidth: 260, flex: "1 1 320px" }}
        />
        <button className="authority-link-button" type="button" onClick={runSafetyTest} disabled={busy}>
          {state === "testing" ? "Checking configuration…" : "Run safety preflight"}
        </button>
        <button className="authority-primary" type="button" onClick={runNow} disabled={busy || mode === "off"}>
          {state === "running" ? "Running autonomous cycle…" : "Run now"}
        </button>
      </div>
      <p className="authority-empty" style={{ marginBottom: 0 }}>
        Preflight is non-publishing: it checks configuration, providers and controls without creating or publishing content.
      </p>
      {message ? <p role="status" className={state === "failed" ? "authority-warning" : "authority-empty"}>{message}</p> : null}

      {preflightChecks.length > 0 ? (
        <div className="kx-preflight-grid" aria-label="Autonomy preflight checks">
          {preflightChecks.map((check) => (
            <article className={`kx-preflight-check ${check.ok ? "ok" : check.required ? "blocked" : "optional"}`} key={check.id}>
              <div>
                <strong>{check.label}</strong>
                <span>{check.required ? "Required" : "Optional"}</span>
              </div>
              <p>{check.detail}</p>
              <b>{check.ok ? "Ready" : check.required ? "Needs repair" : "Not configured"}</b>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
