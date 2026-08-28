"use client";

import { useMemo, useState } from "react";

type Step = {
  name: string;
  status: "completed" | "action_required" | "failed";
  summary: string;
};

type RunResult = {
  status: string;
  startedAt: string;
  completedAt: string;
  steps: Step[];
  nextActions: string[];
  error?: string;
};

export function OperatorConsole() {
  const [secret, setSecret] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const completed = useMemo(() => result?.steps.filter((step) => step.status === "completed").length ?? 0, [result]);
  const actionRequired = useMemo(() => result?.steps.filter((step) => step.status === "action_required").length ?? 0, [result]);
  const failed = useMemo(() => result?.steps.filter((step) => step.status === "failed").length ?? 0, [result]);

  async function runAutonomousSeo() {
    setRunning(true);
    setError(null);
    setResult(null);

    const response = await fetch("/api/operator/seo-autopilot", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret.trim()}`,
      },
      body: JSON.stringify({}),
    });
    const body = await response.json();
    setRunning(false);

    if (!response.ok) {
      setError(body.error ?? "Autopilot failed.");
      return;
    }
    setResult(body);
  }

  return (
    <section className="operator-console" aria-label="Private SEO autopilot console">
      <div className="operator-runner">
        <label>
          Cron secret
          <input
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            placeholder="Paste CRON_SECRET"
            type="password"
          />
        </label>
        <button className="cta operator-button" disabled={running || secret.trim().length === 0} onClick={runAutonomousSeo} type="button">
          {running ? "Running SEO loop..." : "Run autonomous SEO loop"}
        </button>
      </div>

      <div className="operator-links">
        <a href="/admin/authority/command">Authority command</a>
        <a href="/admin/seo">SEO queue</a>
        <a href="/api/seo/ai-sitemap">AI sitemap</a>
        <a href="/llms.txt">llms.txt</a>
      </div>

      {error ? <p className="notice">{error}</p> : null}

      {result ? (
        <section className="operator-result" aria-live="polite">
          <div className="operator-result-head">
            <div>
              <p className="eyebrow">Last run</p>
              <h2>{result.status.replaceAll("_", " ")}</h2>
            </div>
            <div className="operator-counts">
              <span>{completed} completed</span>
              <span>{actionRequired} need setup</span>
              <span>{failed} failed</span>
            </div>
          </div>
          <div className="operator-steps">
            {result.steps.map((step) => (
              <article className={`operator-step ${step.status}`} key={step.name}>
                <strong>{step.name}</strong>
                <span>{step.status.replace("_", " ")}</span>
                <p>{step.summary}</p>
              </article>
            ))}
          </div>
          <div className="operator-next">
            <h2>Next actions</h2>
            <ul>
              {result.nextActions.map((action) => <li key={action}>{action}</li>)}
            </ul>
          </div>
        </section>
      ) : null}
    </section>
  );
}
