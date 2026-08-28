"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "kodex-product-tour-v1";

const steps = [
  {
    title: "Welcome to Kodex Growth Intelligence",
    body: "This workspace turns compliance-market signals into leads, source-backed content, search visibility and measurable authority. The dashboards are public in staging; autonomous controls stay private.",
    callout: "Start in Draft only mode while you validate the outputs. Nothing should publish automatically in that mode.",
    href: "/admin/authority/settings",
    link: "Open autonomy controls",
  },
  {
    title: "Lead Signal Engine",
    body: "The Leads workspace is where buying signals become prospects. Use it to inspect discovered companies, confidence, fit reasons and the next recommended intent or landing page.",
    callout: "Treat confidence as prioritization, not proof. Review the source signal before outreach.",
    href: "/admin/leads",
    link: "Open lead inbox",
  },
  {
    title: "SEO Autopilot",
    body: "The SEO workspace converts verified demand into source-backed pages. Quality gates, revision planning and Google discovery are designed to stop weak content from becoming scaled-content noise.",
    callout: "Draft generation and publication are separate stages. That separation is one of the main safety controls.",
    href: "/admin/seo",
    link: "Open SEO workspace",
  },
  {
    title: "Authority Engine",
    body: "Authority tracks opportunities, content, knowledge sources, citations and LLM visibility. Use Command for system health, Opportunities for demand, Content for assets and Observatory for visibility signals.",
    callout: "A Degraded status can simply mean discovery or monitoring has never completed; open the status details before assuming the system is broken.",
    href: "/admin/authority/command",
    link: "Open Authority Command",
  },
  {
    title: "Autonomy stays opt-in",
    body: "Off is the master stop. Draft only discovers and drafts. Guarded may publish low-risk verified content. Controlled runs the full pipeline within ceilings, but existing approval and claim gates still apply.",
    callout: "Scheduled autonomy requires both AUTOPILOT_SCHEDULE_ENABLED=true and a non-Off stored mode. Your private Render control key is required for manual changes and runs.",
    href: "/tutorial",
    link: "Read full walkthrough",
  },
];

export function ProductTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) !== "done") {
        const timer = window.setTimeout(() => setOpen(true), 650);
        return () => window.clearTimeout(timer);
      }
    } catch {
      // Local storage can be disabled; the manual Tour button still works.
    }
  }, []);

  function finish() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "done");
    } catch {
      // Ignore storage failures; closing the tour should always work.
    }
    setOpen(false);
    setStep(0);
  }

  function launch() {
    setStep(0);
    setOpen(true);
  }

  const current = steps[step];

  return (
    <>
      <button className="kx-tour-launcher" type="button" onClick={launch} aria-label="Open Kodex product tour">
        <span aria-hidden="true">?</span>
        Tour
      </button>

      {open ? (
        <div className="kx-tour-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target) finish();
        }}>
          <section className="kx-tour-card" role="dialog" aria-modal="true" aria-labelledby="kx-tour-title">
            <div className="kx-tour-top">
              <span className="kx-tour-step">Step {step + 1} of {steps.length}</span>
              <button className="kx-tour-close" type="button" onClick={finish} aria-label="Close walkthrough">×</button>
            </div>

            <h2 id="kx-tour-title">{current.title}</h2>
            <p>{current.body}</p>

            <div className="kx-tour-callout">
              <strong>What to know</strong>
              <p>{current.callout}</p>
            </div>

            <div className="kx-tour-progress" aria-label={`Walkthrough progress ${step + 1} of ${steps.length}`}>
              {steps.map((_, index) => <i className={index <= step ? "active" : ""} key={index} />)}
            </div>

            <div className="kx-tour-actions">
              <button type="button" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0}>Back</button>
              <Link href={current.href} onClick={finish}>{current.link}</Link>
              {step < steps.length - 1 ? (
                <button className="primary" type="button" onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))}>Next</button>
              ) : (
                <button className="primary" type="button" onClick={finish}>Finish</button>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
