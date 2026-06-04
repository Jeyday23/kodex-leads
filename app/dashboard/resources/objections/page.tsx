import Link from "next/link";
import {
  ArrowLeft,
  Scale,
  AlertTriangle,
  Gavel,
  MessageSquare,
  ArrowRight,
} from "lucide-react";

const ENFORCEMENT_CASES = [
  {
    company: "Meta (Facebook)",
    fine: "EUR 1.2B",
    reason: "Unlawful EU-US data transfers under GDPR Art. 46",
    year: 2023,
  },
  {
    company: "WhatsApp Ireland",
    fine: "EUR 225M",
    reason: "Lack of transparency in data processing disclosures",
    year: 2021,
  },
  {
    company: "H&M",
    fine: "EUR 35.3M",
    reason: "Excessive employee surveillance and profiling",
    year: 2020,
  },
  {
    company: "British Airways",
    fine: "EUR 22M",
    reason: "Insufficient security measures leading to data breach",
    year: 2020,
  },
  {
    company: "Marriott International",
    fine: "EUR 20.4M",
    reason: "Failure to implement adequate technical measures",
    year: 2020,
  },
  {
    company: "Clearview AI",
    fine: "EUR 20M",
    reason: "Unlawful processing of biometric data without consent",
    year: 2022,
  },
];

const OBJECTIONS = [
  {
    objection: "GDPR doesn't apply to us",
    response:
      "If you process personal data of EU residents, GDPR applies regardless of where your company is based. Personal data includes names, email addresses, IP addresses, cookie identifiers, and device IDs. Even storing a mailing list of EU contacts triggers obligations.",
  },
  {
    objection: "We're too small to get fined",
    response:
      "The GDPR's flat-cap fines of EUR 10M (standard) or EUR 20M (serious tier) apply irrespective of company size. H&M was fined EUR 35.3M not for a data breach but for internal surveillance practices. Small companies are increasingly targeted as supervisory authorities expand enforcement.",
  },
  {
    objection: "We already have a privacy policy",
    response:
      "A privacy policy covers one obligation out of dozens. GDPR compliance also requires data processing agreements, data protection impact assessments, breach notification procedures (72-hour window), records of processing activities, and technical security measures. A policy alone leaves significant gaps.",
  },
  {
    objection: "We'll deal with it if we get audited",
    response:
      "Supervisory authorities don't only act on audits — any data subject can file a complaint directly with their local DPA. A single customer complaint can trigger an investigation. Post-enforcement remediation typically costs 5-10x more than proactive compliance, and fines cannot be reversed.",
  },
  {
    objection: "We don't handle sensitive data",
    response:
      "Even 'basic' personal data carries significant risk. Cross-border data transfers, large-scale processing (10,000+ data subjects), and operating without a DPO are all aggravating factors under Article 83. The standard tier alone exposes you to up to 2% of global turnover or EUR 10M.",
  },
  {
    objection: "Our developer handles security",
    response:
      "Security and compliance are different disciplines. GDPR requires a Data Protection Officer for most organisations processing data at scale. It also demands documented governance: lawful basis for processing, data subject rights procedures, vendor management, and cross-border transfer mechanisms. Technical security is necessary but not sufficient.",
  },
  {
    objection: "It's too expensive to become compliant",
    response:
      "Compare the cost of compliance to the cost of a fine. Even at the standard tier, exposure starts at EUR 10M. Kodex automates the most time-intensive parts — risk assessment, documentation, policy generation — so you achieve compliance in hours instead of months, at a fraction of the cost of manual consulting.",
  },
];

export default function ObjectionsPage() {
  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard/resources"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-navy transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Resources
        </Link>
        <h1 className="text-2xl font-bold text-navy mb-1">
          GDPR Objection Handling Guide
        </h1>
        <p className="text-sm text-text-muted">
          Address common prospect concerns with facts and enforcement data
        </p>
      </div>

      {/* Penalty Framework */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Scale className="w-5 h-5 text-purple" />
          <h2 className="text-lg font-bold text-navy">
            Article 83 Penalty Framework
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="border-2 border-amber-200 rounded-xl p-5 bg-amber-50/50">
            <p className="text-xs font-mono uppercase tracking-widest text-amber-700 mb-2">
              Standard Tier — Art. 83(4)
            </p>
            <p className="text-2xl font-bold text-navy mb-2">
              Up to 2% of annual turnover
            </p>
            <p className="text-sm text-navy mb-1">or EUR 10M, whichever is higher</p>
            <p className="text-xs text-text-muted">
              Applies to: controller/processor obligations, certification bodies, monitoring bodies
            </p>
          </div>
          <div className="border-2 border-red-200 rounded-xl p-5 bg-red-50/50">
            <p className="text-xs font-mono uppercase tracking-widest text-red-700 mb-2">
              Serious Tier — Art. 83(5)
            </p>
            <p className="text-2xl font-bold text-navy mb-2">
              Up to 4% of annual turnover
            </p>
            <p className="text-sm text-navy mb-1">or EUR 20M, whichever is higher</p>
            <p className="text-xs text-text-muted">
              Applies to: core principles violations, lawful basis, data subject rights, cross-border transfers
            </p>
          </div>
        </div>
        <div className="mt-3 border border-border rounded-xl p-4 bg-white">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm text-navy">
              <span className="font-medium">Aggravating factors:</span> Processing
              sensitive data (health, biometric, children&apos;s data), cross-border
              transfers, no DPO appointed, processing 1M+ data subjects, wide
              scope of data categories.
            </p>
          </div>
        </div>
      </div>

      {/* Enforcement Cases */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Gavel className="w-5 h-5 text-purple" />
          <h2 className="text-lg font-bold text-navy">
            Real Enforcement Cases You Can Cite
          </h2>
        </div>
        <div className="space-y-3">
          {ENFORCEMENT_CASES.map((c) => (
            <div
              key={c.company}
              className="flex items-center gap-4 p-4 rounded-xl border border-border bg-white"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-navy">
                  {c.company}{" "}
                  <span className="text-text-muted">({c.year})</span>
                </p>
                <p className="text-xs text-text-muted">{c.reason}</p>
              </div>
              <span className="text-lg font-bold text-red-600 shrink-0">
                {c.fine}
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-text-muted mt-2">
          Source: GDPR Enforcement Tracker. Fines shown are final amounts after appeals where applicable.
        </p>
      </div>

      {/* Objection Responses */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-purple" />
          <h2 className="text-lg font-bold text-navy">
            Common Objections and Responses
          </h2>
        </div>
        <div className="space-y-3">
          {OBJECTIONS.map((o) => (
            <div
              key={o.objection}
              className="border border-border rounded-xl p-5 bg-white"
            >
              <p className="text-sm font-medium text-red-600 mb-2">
                &ldquo;{o.objection}&rdquo;
              </p>
              <p className="text-sm text-navy leading-relaxed">{o.response}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pivot to Kodex */}
      <div className="bg-purple/5 border border-purple/20 rounded-xl p-6">
        <h2 className="text-lg font-bold text-navy mb-3">
          How to Pivot to Kodex
        </h2>
        <div className="space-y-3 text-sm text-navy leading-relaxed">
          <p>
            After addressing objections, pivot to concrete action:
          </p>
          <ol className="list-decimal list-inside space-y-2 ml-1">
            <li>
              Share the{" "}
              <span className="font-medium text-purple">
                GDPR Fine Risk Calculator
              </span>{" "}
              at{" "}
              <code className="text-xs bg-bg-muted px-1.5 py-0.5 rounded">
                /assess/gdpr
              </code>{" "}
              — let the prospect see their own fine exposure.
            </li>
            <li>
              Once they see the numbers, position Kodex as the fastest path to
              close the gap: &ldquo;Kodex gets you audit-ready in hours, not
              months.&rdquo;
            </li>
            <li>
              Emphasise that automated compliance costs a fraction of
              hiring a consultant (EUR 200-400/hr) or a full-time compliance
              officer (EUR 65K-120K/year).
            </li>
          </ol>
        </div>
        <div className="mt-4">
          <Link
            href="/dashboard/resources/roi"
            className="inline-flex items-center gap-2 text-sm text-purple font-medium hover:underline"
          >
            Open the ROI Calculator to model the savings{" "}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
