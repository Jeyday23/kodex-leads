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
}

interface DiscoveryResponse {
  status: string;
  result: {
    mode: "live" | "local-test";
    searchedAt: string;
    query: string;
    leads: DiscoveryLead[];
    nextActions: string[];
  };
}

const thinkingSteps = [
  "Scanning demand signals",
  "Checking LLM discovery gaps",
  "Matching prospect segments",
  "Scoring traffic fit",
  "Saving lead candidates",
];

export function SeoCommandCenter() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<DiscoveryResponse["result"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runDiscovery() {
    setIsRunning(true);
    setError(null);
    setResult(null);
    const response = await fetch("/api/leads/discover", { method: "POST" });
    const body = await response.json();
    setIsRunning(false);
    if (!response.ok) {
      setError(body.error ?? "Lead discovery failed.");
      return;
    }
    setResult(body.result);
  }

  return (
    <main className="main command-center">
      <section className="command-hero">
        <div>
          <p className="eyebrow">Autonomous SEO engine</p>
          <h1>Find traffic opportunities, get cited by LLMs, capture leads.</h1>
          <p className="summary">
            One workflow checks search intent, answer-engine readiness, landing-page fit and lead capture paths.
          </p>
        </div>
        <button className="cta command-button" type="button" onClick={runDiscovery} disabled={isRunning}>
          {isRunning ? "Running..." : "Run Lead Discovery"}
        </button>
      </section>

      <section className="thinking-strip" aria-label="Automation status">
        {thinkingSteps.map((step, index) => (
          <span className={`thinking-bubble ${isRunning ? "is-thinking" : ""}`} style={{ animationDelay: `${index * 120}ms` }} key={step}>
            {step}
          </span>
        ))}
      </section>

      {isRunning ? <SkeletonResults /> : null}
      {error ? <p className="notice">{error}</p> : null}

      {result ? (
        <section className="discovery-results" aria-label="Discovered lead candidates">
          <div className="result-heading">
            <div>
              <p className="eyebrow">{result.mode === "live" ? "Live discovery" : "Local test mode"}</p>
              <h2>{result.leads.length} lead candidates found</h2>
            </div>
            <a className="secondary-link" href="/admin/leads">Open Lead Inbox</a>
          </div>
          <div className="lead-cards">
            {result.leads.map((lead) => (
              <article className="lead-card" key={lead.id}>
                <div>
                  <span>{lead.segment}</span>
                  <strong>{lead.companyName}</strong>
                </div>
                <p>{lead.fitReason}</p>
                <dl>
                  <div>
                    <dt>Intent</dt>
                    <dd>{lead.suggestedSearchIntent}</dd>
                  </div>
                  <div>
                    <dt>Landing page</dt>
                    <dd>{lead.suggestedLandingPage}</dd>
                  </div>
                  <div>
                    <dt>Confidence</dt>
                    <dd>{lead.confidence}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="feature-row" aria-label="Autonomous features">
        <article>
          <h2>Google</h2>
          <p>Sitemap, canonical URLs, robots controls, quality gates and Search Console readiness.</p>
        </article>
        <article>
          <h2>LLMs</h2>
          <p>llms.txt, AI sitemap, answer-first pages and provider sync for ChatGPT, Claude and Perplexity.</p>
        </article>
        <article>
          <h2>Leads</h2>
          <p>Discovery, scoring, local persistence, admin inbox and optional Slack/HubSpot routing.</p>
        </article>
      </section>
    </main>
  );
}

function SkeletonResults() {
  return (
    <section className="lead-cards" aria-label="Loading lead candidates">
      {[0, 1, 2].map((item) => (
        <article className="lead-card skeleton-card" key={item}>
          <span />
          <strong />
          <p />
          <p />
        </article>
      ))}
    </section>
  );
}
