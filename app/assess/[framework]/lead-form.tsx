"use client";

import { useMemo, useState } from "react";
import type { LeadScoreResult } from "@/lib/seo/types";
import { displayFramework } from "@/lib/seo/config";

interface LeadFormProps {
  framework: string;
}

interface LeadResponse {
  status: string;
  persisted: boolean;
  storage: "supabase" | "local";
  leadId: string | null;
  score: LeadScoreResult;
}

export function LeadForm({ framework }: LeadFormProps) {
  const [response, setResponse] = useState<LeadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const frameworkLabel = useMemo(() => displayFramework(framework), [framework]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResponse(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      email: String(formData.get("email") ?? ""),
      companyName: String(formData.get("companyName") ?? ""),
      framework,
      companySize: String(formData.get("companySize") ?? ""),
      aiUse: String(formData.get("aiUse") ?? ""),
      complianceMaturity: String(formData.get("complianceMaturity") ?? ""),
      urgency: String(formData.get("urgency") ?? ""),
      landingPage: window.location.href,
      contentId: new URLSearchParams(window.location.search).get("contentId"),
      searchQueryCluster: new URLSearchParams(window.location.search).get("cluster") ?? framework,
    };

    const result = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await result.json();
    setIsSubmitting(false);

    if (!result.ok) {
      setError(body.error ?? "Lead capture failed.");
      return;
    }

    setResponse(body);
  }

  return (
    <form className="lead-form" onSubmit={onSubmit}>
      <div className="form-grid">
        <label>
          Work email
          <input name="email" type="email" autoComplete="email" required placeholder="you@company.com" />
        </label>
        <label>
          Company
          <input name="companyName" type="text" autoComplete="organization" required placeholder="Company name" />
        </label>
        <label>
          Company size
          <select name="companySize" required defaultValue="51-200">
            <option value="1-10">1-10</option>
            <option value="11-50">11-50</option>
            <option value="51-200">51-200</option>
            <option value="201-1000">201-1000</option>
            <option value="1000+">1000+</option>
          </select>
        </label>
        <label>
          AI usage
          <select name="aiUse" required defaultValue="customer-facing">
            <option value="none">No AI systems yet</option>
            <option value="evaluating">Evaluating AI systems</option>
            <option value="internal">Internal AI workflows</option>
            <option value="customer-facing">Customer-facing AI</option>
            <option value="high-risk">Potential high-risk AI</option>
          </select>
        </label>
        <label>
          SEO maturity
          <select name="complianceMaturity" required defaultValue="starting">
            <option value="unknown">Unknown</option>
            <option value="starting">Starting now</option>
            <option value="documented">Documented controls</option>
            <option value="audited">Audited program</option>
          </select>
        </label>
        <label>
          Timeline
          <select name="urgency" required defaultValue="this-month">
            <option value="researching">Researching</option>
            <option value="this-quarter">This quarter</option>
            <option value="this-month">This month</option>
            <option value="immediate">Immediate</option>
          </select>
        </label>
      </div>

      <button className="cta form-submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Scoring..." : `Score ${frameworkLabel} readiness`}
      </button>

      {error ? <p className="notice">{error}</p> : null}
      {response ? (
        <output className="result-panel">
          <span className="eyebrow">Lead score</span>
          <strong>{response.score.score} / 100</strong>
          <span>{response.score.grade}</span>
          <span>Recommended action: {response.score.recommendedAction}</span>
          <span>{response.storage === "supabase" ? "Saved to Supabase." : "Saved to local workspace storage."}</span>
        </output>
      ) : null}
    </form>
  );
}
