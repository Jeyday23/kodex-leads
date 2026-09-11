"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Local structural types only: this client component must never import types
// from a module that reaches lib/seo/db.ts, even a type-only import, since
// tests/server-module-boundaries.test.ts cannot distinguish type-only
// imports from value imports.
interface ScoreFactor {
  factor: string;
  weight: number;
  contribution: number;
  evidence: string;
  howToImprove: string;
}

interface ScoreResult {
  confidence: number;
  factors: ScoreFactor[];
  whatWouldMoveTheScore: string[];
  rationale: string;
  rationaleSource: "llm" | "template";
}

export default function LeadScoreForm() {
  const router = useRouter();
  const [leadRef, setLeadRef] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [personTitle, setPersonTitle] = useState("");
  const [companyVertical, setCompanyVertical] = useState("");
  const [geography, setGeography] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "failed">("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("saving");
    setMessage("");
    try {
      const response = await fetch("/api/growth/leads/score", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          leadRef: leadRef || `manual-${Date.now()}`,
          leadTable: "manual",
          companyName,
          personTitle: personTitle || undefined,
          companyVertical: companyVertical || undefined,
          geography: geography || undefined,
          companySize: companySize || undefined,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message ?? `Request failed with HTTP ${response.status}.`);
      setResult(payload.data as ScoreResult);
      setState("idle");
      router.refresh();
    } catch (reason) {
      setState("failed");
      setMessage(reason instanceof Error ? reason.message : "Could not score this lead.");
    }
  }

  return (
    <div className="authority-stack">
      <form className="authority-stack" onSubmit={submit}>
        <label>
          Lead reference (optional)
          <input value={leadRef} onChange={(event) => setLeadRef(event.target.value)} style={{ width: "100%" }} />
        </label>
        <label>
          Company name
          <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} required style={{ width: "100%" }} />
        </label>
        <label>
          Contact title
          <input value={personTitle} onChange={(event) => setPersonTitle(event.target.value)} style={{ width: "100%" }} />
        </label>
        <label>
          Vertical
          <input value={companyVertical} onChange={(event) => setCompanyVertical(event.target.value)} style={{ width: "100%" }} />
        </label>
        <label>
          Geography
          <input value={geography} onChange={(event) => setGeography(event.target.value)} style={{ width: "100%" }} />
        </label>
        <label>
          Company size
          <input value={companySize} onChange={(event) => setCompanySize(event.target.value)} placeholder="e.g. 51-200" style={{ width: "100%" }} />
        </label>
        <button className="authority-primary" type="submit" disabled={state === "saving"}>
          {state === "saving" ? "Scoring..." : "Score lead"}
        </button>
        {message ? <p role="alert">{message}</p> : null}
      </form>

      {result ? (
        <div className="authority-panel">
          <h3>Confidence: {result.confidence.toFixed(1)} / 100</h3>
          <p>{result.rationale} {result.rationaleSource === "template" ? "(templated, no LLM configured)" : ""}</p>
          <div className="authority-stack">
            {result.factors.map((factor) => (
              <div key={factor.factor}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{factor.factor}</span>
                  <span>{factor.contribution.toFixed(1)} / {factor.weight}</span>
                </div>
                <div style={{ background: "rgba(127,127,127,0.2)", height: 8, borderRadius: 4 }}>
                  <div
                    style={{
                      width: `${factor.weight > 0 ? (factor.contribution / factor.weight) * 100 : 0}%`,
                      background: "currentColor",
                      height: 8,
                      borderRadius: 4,
                    }}
                  />
                </div>
                <small>{factor.evidence}</small>
              </div>
            ))}
          </div>
          {result.whatWouldMoveTheScore.length > 0 ? (
            <>
              <h4>What would move this score</h4>
              <ul>
                {result.whatWouldMoveTheScore.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
