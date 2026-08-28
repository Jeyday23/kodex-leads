"use client";

import { useState } from "react";

type Mode = "off" | "draft_only" | "guarded" | "controlled";
type ControlState = "idle" | "saving" | "running" | "testing" | "done" | "failed";

const labels: Record<Mode, { title: string; detail: string }> = {
  off: { title: "Off", detail: "No autonomous discovery, drafting or publishing runs." },
  draft_only: { title: "Draft only", detail: "Find opportunities and draft content, but never publish automatically." },
  guarded: { title: "Guarded", detail: "May publish only low-risk, fully verified content that does not require approval." },
  controlled: { title: "Controlled", detail: "Runs the full pipeline within limits, but still blocks approval-required or unsafe content." },
};

export function AutopilotControl({ currentMode }: { currentMode: Mode }) {
  const [mode, setMode] = useState<Mode>(currentMode);
  const [secret, setSecret] = useState("");
  const [state, setState] = useState<ControlState>("idle");
  const [message, setMessage] = useState("");

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
    if (!response.ok) {
      setState("failed");
      setMessage((await response.json().catch(() => null))?.error ?? "Could not change autonomy mode.");
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
    if (!response.ok) {
      setState("failed");
      setMessage((await response.json().catch(() => null))?.error ?? "Autopilot run failed.");
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
    const response = await fetch("/api/authority/autopilot/run", {
      method: "POST",
      headers: { "content-type": "application/json", "x-kodex-control-secret": secret },
      body: JSON.stringify({ acceptance: true }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setState("failed");
      setMessage(payload?.error ?? "Safety test failed.");
      return;
    }
    setState("done");
    setMessage("Safety acceptance test completed successfully. You can review the audit trail before running a normal cycle.");
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
          {state === "testing" ? "Testing safety gates…" : "Run safety test"}
        </button>
        <button className="authority-primary" type="button" onClick={runNow} disabled={busy || mode === "off"}>
          {state === "running" ? "Running autonomous cycle…" : "Run now"}
        </button>
      </div>
      <p className="authority-empty" style={{ marginBottom: 0 }}>
        Safety test does not require autonomy to be armed. Use it to validate acceptance controls before a normal run.
      </p>
      {message ? <p role="status" className={state === "failed" ? "authority-warning" : "authority-empty"}>{message}</p> : null}
    </section>
  );
}
