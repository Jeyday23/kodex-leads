import Link from "next/link";
import {
  ArrowLeft,
  Target,
  HelpCircle,
  Workflow,
  Coins,
  ShieldCheck,
  Users,
  Brain,
  TrendingUp,
  Briefcase,
} from "lucide-react";

const ICP_SIGNALS = [
  { signal: "Uses AI in production", detail: "Generative AI, Computer Vision, NLP, Predictive Analytics, Recommendation Systems", icon: Brain },
  { signal: "Team size 11-200", detail: "Scale-ups and mid-market — large enough for compliance obligations, small enough to need external help", icon: Users },
  { signal: "Recently funded", detail: "Seed, Series A, or Series B — investors increasingly require compliance as a condition", icon: TrendingUp },
  { signal: "Hiring compliance roles", detail: "Job postings for DPO, Compliance Officer, or GDPR roles signal awareness but lack of internal capability", icon: Briefcase },
  { signal: "No existing compliance", detail: "Assessment shows zero compliance measures — highest urgency, strongest pitch", icon: ShieldCheck },
];

const DISCOVERY_QUESTIONS = [
  { question: "What AI or ML do you use in production?", maps_to: "AI type classification and EU AI Act risk tier" },
  { question: "What compliance frameworks do you follow today?", maps_to: "Gap analysis — GDPR, ISO 27001, SOC 2, NIS2, DORA" },
  { question: "Do you have a DPO or compliance team?", maps_to: "Resource gap — key GDPR and AI Act requirement" },
  { question: "Do you transfer data outside the EU?", maps_to: "Cross-border transfer risk — major GDPR enforcement area" },
  { question: "How many users or data subjects do you process?", maps_to: "Scale of processing — affects fine exposure and DPO requirement" },
  { question: "When was your last compliance audit?", maps_to: "Urgency signal — if never, compliance debt is high" },
];

const WORKFLOW_STEPS = [
  {
    step: "1",
    title: "Review Prospects",
    desc: "Start in the Prospects tab. Leads are ranked by score — higher scores indicate stronger compliance need. Look for signals: Uses AI, Recently Funded, Hiring for Compliance.",
    path: "/dashboard",
  },
  {
    step: "2",
    title: "Claim Leads",
    desc: "Click 'Claim' on prospects you want to work. Claimed leads move to your Pipeline and are no longer visible to other partners.",
    path: "/dashboard",
  },
  {
    step: "3",
    title: "Research and Outreach",
    desc: "Use enriched contact data (decision-maker names, titles, emails) to reach out. Reference their specific compliance gaps from the lead signals.",
    path: "/dashboard/leads",
  },
  {
    step: "4",
    title: "Share Assessment Tools",
    desc: "Send prospects to the free EU AI Act Assessment (/assess/eu-ai-act) or GDPR Fine Calculator (/assess/gdpr). These tools generate urgency by showing their risk exposure.",
    path: null,
  },
  {
    step: "5",
    title: "Track Pipeline",
    desc: "Move leads through stages: Not Contacted, Emailed, Replied, Meeting Booked, Converted. The Pipeline tab gives you a Kanban view of all your active deals.",
    path: "/dashboard/pipeline",
  },
  {
    step: "6",
    title: "Close and Earn",
    desc: "When a prospect signs up for Kodex Compliance, the conversion is tracked automatically via Stripe. Your commission appears in the Conversions tab.",
    path: "/dashboard/conversions",
  },
];

const PARTNER_RULES = [
  "Represent Kodex Compliance services accurately — do not make claims beyond documented capabilities.",
  "Lead data is for direct compliance-related outreach only. Do not resell, share, or use for unrelated purposes.",
  "Comply with GDPR when contacting leads — you must have a lawful basis for outreach.",
  "Do not use automated tools for bulk extraction of lead data from the dashboard.",
  "Contact prospects directly — do not delegate to unlicensed third parties.",
];

export default function PlaybookPage() {
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
          Partner Sales Playbook
        </h1>
        <p className="text-sm text-text-muted">
          Your complete guide to selling Kodex Compliance
        </p>
      </div>

      {/* Value Proposition */}
      <div className="bg-navy rounded-xl p-6 text-white">
        <h2 className="text-lg font-bold mb-2">The Kodex Value Proposition</h2>
        <p className="text-white/80 text-sm leading-relaxed mb-4">
          &ldquo;Kodex Compliance gets startups audit-ready in hours, not months.&rdquo;
        </p>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-sm font-medium">Target Market</p>
            <p className="text-xs text-white/70 mt-1">
              EU-based companies (or processing EU data) that use AI, are recently funded, or are scaling
            </p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-sm font-medium">Frameworks Covered</p>
            <p className="text-xs text-white/70 mt-1">
              GDPR, EU AI Act, ISO 27001, NIS2, DORA, SOC 2
            </p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-sm font-medium">Key Differentiator</p>
            <p className="text-xs text-white/70 mt-1">
              Automated compliance — replaces months of manual consulting with structured, tool-driven implementation
            </p>
          </div>
        </div>
      </div>

      {/* Ideal Customer Profile */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-purple" />
          <h2 className="text-lg font-bold text-navy">
            Ideal Customer Profile
          </h2>
        </div>
        <p className="text-sm text-text-muted mb-4">
          The lead scoring system prioritises these signals. Look for prospects
          that match multiple criteria — they convert at the highest rate.
        </p>
        <div className="space-y-3">
          {ICP_SIGNALS.map((s) => (
            <div
              key={s.signal}
              className="flex items-start gap-4 border border-border rounded-xl p-4 bg-white"
            >
              <div className="w-8 h-8 rounded-lg bg-purple/10 flex items-center justify-center shrink-0">
                <s.icon className="w-4 h-4 text-purple" />
              </div>
              <div>
                <p className="text-sm font-medium text-navy">{s.signal}</p>
                <p className="text-xs text-text-muted mt-0.5">{s.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Discovery Questions */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="w-5 h-5 text-purple" />
          <h2 className="text-lg font-bold text-navy">Discovery Questions</h2>
        </div>
        <p className="text-sm text-text-muted mb-4">
          Use these in initial conversations. Each question maps directly to a
          compliance gap that Kodex addresses.
        </p>
        <div className="border border-border rounded-xl overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-muted border-b border-border">
                <th className="text-left px-4 py-3 font-medium text-text-muted">
                  Question
                </th>
                <th className="text-left px-4 py-3 font-medium text-text-muted">
                  What it reveals
                </th>
              </tr>
            </thead>
            <tbody>
              {DISCOVERY_QUESTIONS.map((q) => (
                <tr
                  key={q.question}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3 text-navy font-medium">
                    {q.question}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{q.maps_to}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dashboard Workflow */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Workflow className="w-5 h-5 text-purple" />
          <h2 className="text-lg font-bold text-navy">
            Dashboard Workflow
          </h2>
        </div>
        <div className="space-y-3">
          {WORKFLOW_STEPS.map((s) => (
            <div
              key={s.step}
              className="flex gap-4 border border-border rounded-xl p-4 bg-white"
            >
              <div className="w-8 h-8 rounded-full bg-purple/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-purple">{s.step}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-navy">{s.title}</p>
                <p className="text-xs text-text-muted mt-1">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Commission Structure */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Coins className="w-5 h-5 text-purple" />
          <h2 className="text-lg font-bold text-navy">Earning Commissions</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="border border-border rounded-xl p-5 bg-white text-center">
            <p className="text-2xl font-bold text-purple mb-1">15%</p>
            <p className="text-xs text-text-muted">
              Default commission rate on every conversion
            </p>
          </div>
          <div className="border border-border rounded-xl p-5 bg-white text-center">
            <p className="text-2xl font-bold text-navy mb-1">Net 30</p>
            <p className="text-xs text-text-muted">
              Commission paid 30 days after confirmed conversion
            </p>
          </div>
          <div className="border border-border rounded-xl p-5 bg-white text-center">
            <p className="text-2xl font-bold text-navy mb-1">Stripe</p>
            <p className="text-xs text-text-muted">
              Automatic tracking — conversions appear in your dashboard
            </p>
          </div>
        </div>
      </div>

      {/* Partner Rules */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-purple" />
          <h2 className="text-lg font-bold text-navy">Partner Guidelines</h2>
        </div>
        <div className="border border-border rounded-xl p-5 bg-white space-y-3">
          {PARTNER_RULES.map((rule, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-xs font-mono text-text-muted mt-0.5 shrink-0">
                {i + 1}.
              </span>
              <p className="text-sm text-navy">{rule}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-text-muted mt-2">
          Full terms at{" "}
          <Link href="/terms" className="text-purple hover:underline">
            /terms
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
