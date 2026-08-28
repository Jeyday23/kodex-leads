"use client";

import { useState } from "react";

interface DiscoveryLead {
  id: string;
  companyName: string;
  website: string;
  segment: string;
  fitReason: string;
  suggestedSearchIntent: string;
  suggestedLandingPage: string;
  confidence: number;
  source: string;
  sourceUrl: string;
  retrievedAt: string;
  contactEmail?: string | null;
  triggerCategory?: string | null;
  regulatoryFramework?: string | null;
  fineAmount?: string | null;
  decisionMakerName?: string | null;
  decisionMakerTitle?: string | null;
}

interface DiscoveryResponse {
  status: string;
  result: {
    mode: "live";
    searchedAt: string;
    query: string;
    leads: DiscoveryLead[];
    errors: string[];
    nextActions: string[];
  };
  errors?: string[];
  error?: string;
}

const thinkingSteps = [
  "Scanning enforcement and market signals",
  "Checking new-company activity",
  "Matching regulatory exposure",
  "Finding compliance decision makers",
  "Saving verified lead candidates",
];

export function SeoCommandCenter() {
  const [isRunning, setIsRunning] = useState(false);
  const [secret, setSecret] = useState("");
  const [result, setResult] = useState<DiscoveryResponse["result"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runDiscovery() {
    if (!secret.trim()) {
      setError("Enter the private control key before running lead discovery.");
      return;
    }
    setIsRunning(true);
    setError(null);
    setResult(null);
    const response = await fetch("/api/leads/discover", {
      method: "POST",
      headers: { "x-kodex-control-secret": secret },
    });
    const body = await response.json().catch(() => ({}));
    setIsRunning(false);
    if (!response.ok) {
      const details = Array.isArray(body.errors) && body.errors.length > 0 ? ` ${body.errors.join(" ")}` : "";
      setError(`${body.error ?? "Lead discovery returned no live leads."}${details}`);
      if (body.result) setResult(body.result);
      return;
    }
    setResult(body.result);
  }

  return (
    <section className="command-center">
      <section className="command-hero">
        <div>
          <p className="eyebrow">Private lead intelligence</p>
          <h1>Find regulatory signals, the company, and the person who owns the decision.</h1>
          <p className="summary">
            Scan evidence-backed enforcement, new-company formation, compliance hiring, funding and AI-product signals, then prioritize the most likely compliance, privacy, legal, security or executive buyer.
          </p>
        </div>
        <div className="kx-command-control">
          <input
            type="password"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            placeholder="Private control key"
            aria-label="Private lead discovery control key"
            autoComplete="off"
          />
          <button className="cta command-button" type="button" onClick={runDiscovery} disabled={isRunning}>
            {isRunning ? "Running…" : "Run Lead Discovery"}
          </button>
        </div>
      </section>

      <section className="thinking-strip" aria-label="Automation status">
        {thinkingSteps.map((step, index) => (
          <span className={`thinking-bubble ${isRunning ? "is-thinking" : ""}`} style={{ animationDelay: `${index * 120}ms` }} key={step}>
            {step}
          </span>
        ))}
      </section>

      {isRunning ? <SkeletonResults /> : null}
      {error ? <p className="notice" role="alert">{error}</p> : null}

      {result ? (
        <section className="discovery-results" aria-label="Discovered lead candidates">
          <div className="result-heading">
            <div>
              <p className="eyebrow">Live discovery</p>
              <h2>{result.leads.length} lead candidates found</h2>
            </div>
            <a className="secondary-link" href="/admin/leads">Open Lead Inbox</a>
          </div>
          {result.errors.length > 0 ? <p className="notice">{result.errors.join(" ")}</p> : null}
          <div className="lead-cards">
            {result.leads.map((lead) => (
              <article className="lead-card" key={lead.id}>
                <div>
                  <span>{lead.triggerCategory ?? lead.segment}</span>
                  <strong>{lead.companyName}</strong>
                </div>
                <p>{lead.fitReason}</p>
                <dl>
                  <div>
                    <dt>Framework</dt>
                    <dd>{lead.regulatoryFramework ?? "Needs classification"}</dd>
                  </div>
                  <div>
                    <dt>Decision maker</dt>
                    <dd>{lead.decisionMakerName ?? lead.decisionMakerTitle ?? "Not resolved"}</dd>
                  </div>
                  {lead.fineAmount ? (
                    <div>
                      <dt>Published fine</dt>
                      <dd>{lead.fineAmount}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>Source</dt>
                    <dd><a href={lead.sourceUrl} target="_blank" rel="noreferrer">{lead.source}</a></dd>
                  </div>
                  <div>
                    <dt>Confidence</dt>
                    <dd>{lead.confidence} / 100</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="feature-row" aria-label="Autonomous features">
        <article>
          <h2>Enforcement</h2>
          <p>Evidence-backed fine and enforcement signals keep the sales angle tied to a public source.</p>
        </article>
        <article>
          <h2>New companies</h2>
          <p>Optional North Data discovery targets recent German GmbH and UG registrations when configured.</p>
        </article>
        <article>
          <h2>Decision makers</h2>
          <p>Hunter enrichment works today when configured; Apollo can improve role discovery when the API plan supports People Search.</p>
        </article>
      </section>
    </section>
  );
}

function SkeletonResults() {
  return (
    <section className="lead-cards" aria-label="Loading lead candidates" role="status">
      {[0, 1, 2].map((item) => (
        <article className="lead-card skeleton-card" key={item}>
          <span />
          <strong />
          <p />
          <p />
        </article>
      ))}
      <span className="sr-only">Discovering regulatory lead candidates…</span>
    </section>
  );
}
