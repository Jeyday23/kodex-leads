"use client";

import Link from "next/link";
import { useState } from "react";

type Mode = "off" | "draft_only" | "guarded" | "controlled";
type ControlState = "idle" | "saving" | "running" | "testing" | "done" | "failed";
type PreflightCheck = { id: string; label: string; ok: boolean; required: boolean; detail: string };

interface AutopilotControlProps {
  currentMode: Mode;
  scheduleEnabled: boolean;
  databaseConfigured: boolean;
  maxNewPagesPerDay: number;
  maxRevisionsPerDay: number;
  changedAt?: string | null;
}

const modeOrder: Mode[] = ["off", "draft_only", "guarded", "controlled"];

const labels: Record<Mode, { title: string; detail: string; permissions: string }> = {
  off: {
    title: "Off",
    detail: "Stops manual and scheduled autonomy runs.",
    permissions: "No discovery, drafting or publishing.",
  },
  draft_only: {
    title: "Draft only",
    detail: "Finds opportunities and prepares content for review.",
    permissions: "Discovery and drafting; never auto-publishes.",
  },
  guarded: {
    title: "Guarded",
    detail: "Publishes only low-risk content that passes every gate.",
    permissions: "Approval-required content stays blocked.",
  },
  controlled: {
    title: "Controlled",
    detail: "Runs the full pipeline within the configured daily limits.",
    permissions: "Unsafe and approval-required content stays blocked.",
  },
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

function authorizationError(status: number): string | null {
  if (status === 401) return "Your session is not signed in. Sign in as a Kodex administrator at /auth/login and try again.";
  if (status === 403) return "This account is not authorized. Sign in with a Kodex administrator account to run this action.";
  return null;
}

function formatChangedAt(value?: string | null) {
  if (!value) return "No saved change recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Last change recorded";
  return `Changed ${date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`;
}

export function AutopilotControl({
  currentMode,
  scheduleEnabled,
  databaseConfigured,
  maxNewPagesPerDay,
  maxRevisionsPerDay,
  changedAt,
}: AutopilotControlProps) {
  const [mode, setMode] = useState<Mode>(currentMode);
  const [selectedMode, setSelectedMode] = useState<Mode>(currentMode);
  const [state, setState] = useState<ControlState>("idle");
  const [message, setMessage] = useState("");
  const [preflightChecks, setPreflightChecks] = useState<PreflightCheck[]>([]);
  const [confirmingRun, setConfirmingRun] = useState(false);
  const [lastRunSummary, setLastRunSummary] = useState<string | null>(null);

  const busy = state === "saving" || state === "running" || state === "testing";
  const modeChanged = selectedMode !== mode;

  async function saveMode() {
    if (!modeChanged) {
      setState("done");
      setMessage(`${labels[mode].title} is already the active mode.`);
      return;
    }

    setState("saving");
    setMessage("");
    setConfirmingRun(false);
    try {
      const response = await fetch("/api/authority/autopilot/status", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ mode: selectedMode }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setState("failed");
        setMessage(authorizationError(response.status) ?? responseError(payload, "Could not change autonomy mode."));
        return;
      }
      setMode(selectedMode);
      setState("done");
      setMessage(`Saved. ${labels[selectedMode].title} is now the active mode.`);
    } catch {
      setState("failed");
      setMessage("Could not reach the control service. Check the deployment and try again.");
    }
  }

  async function runNow() {
    if (mode === "off") {
      setState("failed");
      setMessage("Autonomy is off. Select another mode and save it before running.");
      return;
    }
    if (modeChanged) {
      setState("failed");
      setMessage("Save the selected mode before starting a run.");
      return;
    }

    setState("running");
    setMessage("");
    setLastRunSummary(null);
    try {
      const response = await fetch("/api/authority/autopilot/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({}),
      });
      const payload = await response.json().catch(() => null) as {
        data?: { leadDiscovery?: { leads?: unknown[]; errors?: unknown[] } };
      } | null;
      if (!response.ok) {
        setState("failed");
        setMessage(authorizationError(response.status) ?? responseError(payload, "Autopilot run failed."));
        return;
      }
      const leadCount = Array.isArray(payload?.data?.leadDiscovery?.leads) ? payload.data.leadDiscovery.leads.length : 0;
      const warningCount = Array.isArray(payload?.data?.leadDiscovery?.errors) ? payload.data.leadDiscovery.errors.length : 0;
      const summary = `${leadCount} lead${leadCount === 1 ? "" : "s"} returned${warningCount ? ` with ${warningCount} source warning${warningCount === 1 ? "" : "s"}` : ""}.`;
      setLastRunSummary(summary);
      setState("done");
      setMessage("Autonomous cycle completed. Review the workspace results below.");
      setConfirmingRun(false);
    } catch {
      setState("failed");
      setMessage("Could not reach the autonomy service. No completion was recorded.");
    }
  }

  async function runSafetyTest() {
    setState("testing");
    setMessage("");
    setPreflightChecks([]);
    setConfirmingRun(false);
    try {
      const response = await fetch("/api/authority/autopilot/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ preflight: true }),
      });
      const payload = await response.json().catch(() => null) as { data?: { ok?: boolean; checks?: PreflightCheck[] } } | null;
      if (!response.ok) {
        setState("failed");
        setMessage(authorizationError(response.status) ?? responseError(payload, "Preflight failed."));
        return;
      }
      const checks = Array.isArray(payload?.data?.checks) ? payload.data.checks : [];
      setPreflightChecks(checks);
      const ready = payload?.data?.ok === true;
      setState(ready ? "done" : "failed");
      setMessage(ready
        ? "Preflight passed. Required controls are configured; nothing was created or published."
        : "Preflight found blocking configuration issues. Nothing was created or published.");
    } catch {
      setState("failed");
      setMessage("Could not reach the preflight service. Nothing was created or published.");
    }
  }

  function requestRun() {
    if (mode === "off") {
      setState("failed");
      setMessage("Autonomy is off. Select another mode and save it before running.");
      return;
    }
    if (modeChanged) {
      setState("failed");
      setMessage("Save the selected mode before starting a run.");
      return;
    }
    setMessage("");
    setConfirmingRun(true);
  }

  return (
    <section className="kx-autopilot" aria-labelledby="autopilot-heading">
      <header className="kx-autopilot-header">
        <div>
          <p className="eyebrow">Private control</p>
          <h2 id="autopilot-heading">Autonomy control</h2>
          <p>Choose what the system may do, authorize the change, then test or run it.</p>
        </div>
        <div className="kx-mode-state" aria-label={`Active mode ${labels[mode].title}`}>
          <span>Active mode</span>
          <strong>{labels[mode].title}</strong>
        </div>
      </header>

      <div className="kx-policy-strip" aria-label="Current autonomy policy">
        <span><b>{scheduleEnabled ? "Scheduled runs on" : "Scheduled runs off"}</b></span>
        <span>{maxNewPagesPerDay} new pages/day</span>
        <span>{maxRevisionsPerDay} revisions/day</span>
        <span>{databaseConfigured ? "Settings database connected" : "Settings database unavailable"}</span>
        <span>{formatChangedAt(changedAt)}</span>
      </div>

      <div className="kx-control-step">
        <div className="kx-step-heading">
          <span>1</span>
          <div>
            <h3>Select a mode</h3>
            <p>Selecting a card does not change the live system until you save.</p>
          </div>
        </div>
        <div className="kx-mode-grid">
          {modeOrder.map((item) => {
            const isSelected = item === selectedMode;
            const isActive = item === mode;
            return (
              <button
                key={item}
                type="button"
                className="kx-mode-card"
                data-selected={isSelected ? "true" : "false"}
                aria-pressed={isSelected}
                onClick={() => {
                  setSelectedMode(item);
                  setConfirmingRun(false);
                  setMessage("");
                }}
                disabled={busy}
              >
                <span className="kx-mode-card-topline">
                  <strong>{labels[item].title}</strong>
                  {isActive ? <em>Active</em> : null}
                </span>
                <span>{labels[item].detail}</span>
                <small>{labels[item].permissions}</small>
              </button>
            );
          })}
        </div>
      </div>

      <div className="kx-control-step">
        <div className="kx-step-heading">
          <span>2</span>
          <div>
            <h3>Save the selected mode</h3>
            <p>
              Every action on this page runs as the signed-in administrator. Provider API keys are not configured here.
              <span className="kx-info" tabIndex={0} aria-label="Provider key help">?
                <span role="tooltip">North Data, OpenAI, Anthropic, Perplexity, Hunter and Apollo keys belong in the Render environment.</span>
              </span>
            </p>
          </div>
        </div>
        <div className="kx-secret-row">
          <p>Your administrator session authorizes this change. Nothing is stored in the browser.</p>
        </div>
        <div className="kx-control-actions">
          <button className="kx-control-button secondary" type="button" onClick={saveMode} disabled={busy || !modeChanged}>
            {state === "saving" ? "Saving mode…" : modeChanged ? `Save ${labels[selectedMode].title}` : "Mode saved"}
          </button>
          <span>{modeChanged ? "Save the selected mode before running." : "Authorized as the signed-in administrator."}</span>
        </div>
      </div>

      <div className="kx-control-step">
        <div className="kx-step-heading">
          <span>3</span>
          <div>
            <h3>Test, then run</h3>
            <p>Preflight is non-publishing: it checks required configuration without creating leads, drafts or pages.</p>
          </div>
        </div>
        <div className="kx-run-actions">
          <button className="kx-control-button secondary" type="button" onClick={runSafetyTest} disabled={busy}>
            {state === "testing" ? "Checking configuration…" : "Run safety preflight"}
          </button>
          <button className="kx-control-button primary" type="button" onClick={requestRun} disabled={busy || mode === "off" || modeChanged}>
            Run autonomous cycle
          </button>
        </div>

        {confirmingRun ? (
          <div className="kx-run-confirm" role="alert">
            <div>
              <strong>Start one {labels[mode].title.toLowerCase()} cycle?</strong>
              <p>The run may discover leads and create drafts. Publishing remains limited by the active mode and risk gates.</p>
            </div>
            <div>
              <button className="kx-control-button quiet" type="button" onClick={() => setConfirmingRun(false)}>Cancel</button>
              <button className="kx-control-button primary" type="button" onClick={runNow} disabled={busy}>
                {state === "running" ? "Running…" : "Confirm run"}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {message ? (
        <div className="kx-control-message" data-state={state === "failed" ? "error" : "success"} role="status" aria-live="polite">
          {message}
        </div>
      ) : null}

      {preflightChecks.length > 0 ? (
        <div className="kx-preflight-grid" aria-label="Autonomy preflight checks">
          {preflightChecks.map((check) => (
            <article className={`kx-preflight-check ${check.ok ? "ok" : check.required ? "blocked" : "optional"}`} key={check.id}>
              <div>
                <strong>{check.label}</strong>
                <span>{check.required ? "Required" : "Optional"}</span>
              </div>
              <p>{check.detail}</p>
              <b>{check.ok ? "Configured" : check.required ? "Needs repair" : "Not configured"}</b>
            </article>
          ))}
        </div>
      ) : null}

      {lastRunSummary ? (
        <div className="kx-run-result">
          <div>
            <span>Latest manual run</span>
            <strong>{lastRunSummary}</strong>
          </div>
          <nav aria-label="Review autonomous run results">
            <Link href="/admin/leads">Review leads</Link>
            <Link href="/admin/authority/opportunities">Review opportunities</Link>
            <Link href="/admin/authority/editorial">Review drafts</Link>
          </nav>
        </div>
      ) : null}
    </section>
  );
}
