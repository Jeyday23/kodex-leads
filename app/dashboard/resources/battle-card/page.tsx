import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  Shield,
  FileText,
  Users,
  Brain,
  CheckCircle,
  MessageSquare,
} from "lucide-react";

const RISK_TIERS = [
  {
    level: "High Risk",
    threshold: "Score 60+",
    color: "bg-red-100 text-red-700",
    description:
      "Full conformity assessment, technical documentation, human oversight, and post-market monitoring required.",
    examples: "Biometric identification, critical infrastructure AI, employment screening, credit scoring",
  },
  {
    level: "Limited Risk",
    threshold: "Score 30–59",
    color: "bg-amber-100 text-amber-700",
    description:
      "Transparency obligations apply. Users must be informed they are interacting with AI.",
    examples: "Chatbots, emotion recognition, deep fake generators",
  },
  {
    level: "Minimal Risk",
    threshold: "Score below 30",
    color: "bg-emerald-100 text-emerald-700",
    description:
      "No mandatory obligations, but voluntary codes of conduct are encouraged.",
    examples: "Spam filters, AI-powered search, inventory management",
  },
];

const COMPLIANCE_REQUIREMENTS = [
  { title: "AI risk assessment process", desc: "Classify all AI systems by risk tier and document findings." },
  { title: "Data protection impact assessment", desc: "Evaluate risks to individuals from AI-driven data processing." },
  { title: "Human oversight procedures", desc: "Ensure humans can intervene in and override AI decisions." },
  { title: "Technical documentation", desc: "Maintain detailed records of AI system design, training data, and testing." },
];

const OBJECTIONS = [
  {
    objection: "We don't use AI",
    response:
      "Many companies use AI without realising it qualifies under the Act. NLP in customer support, recommendation engines, predictive analytics, and automated decision-making all count. The Act defines AI broadly.",
  },
  {
    objection: "We're too small to worry about this",
    response:
      "The EU AI Act applies based on risk classification, not company size. A 10-person startup deploying high-risk AI has the same obligations as an enterprise. Non-compliance fines start at EUR 7.5M or 1% of turnover.",
  },
  {
    objection: "We already have GDPR covered",
    response:
      "GDPR covers personal data protection. The AI Act covers AI-specific risks: algorithmic bias, transparency, human oversight, and conformity assessments. They are complementary frameworks, not substitutes.",
  },
  {
    objection: "August 2 is still far away",
    response:
      "A proper compliance programme takes 8-10 weeks minimum: system inventory, risk classification, documentation, oversight procedures, and internal audit. Starting late means rushing conformity assessments or missing the deadline entirely.",
  },
];

export default function BattleCardPage() {
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
          EU AI Act Battle Card
        </h1>
        <p className="text-sm text-text-muted">
          Quick-reference talking points for prospect conversations
        </p>
      </div>

      {/* Urgency Hook */}
      <div className="bg-navy rounded-xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold mb-1">
              Enforcement begins August 2, 2025
            </h2>
            <p className="text-white/70 text-sm leading-relaxed">
              The EU AI Act (Regulation 2024/1689) enters full enforcement on
              August 2. Companies deploying AI systems in or into the EU must
              have risk assessments, technical documentation, and human
              oversight procedures in place. A structured 66-day action plan
              can close the gap — but only if companies start now.
            </p>
          </div>
        </div>
      </div>

      {/* Risk Classifications */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-purple" />
          <h2 className="text-lg font-bold text-navy">
            Risk Classifications
          </h2>
        </div>
        <div className="space-y-3">
          {RISK_TIERS.map((tier) => (
            <div
              key={tier.level}
              className="border border-border rounded-xl p-5 bg-white"
            >
              <div className="flex items-center gap-3 mb-2">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${tier.color}`}
                >
                  {tier.level}
                </span>
                <span className="text-xs text-text-muted">{tier.threshold}</span>
              </div>
              <p className="text-sm text-navy mb-2">{tier.description}</p>
              <p className="text-xs text-text-muted">
                <span className="font-medium">Examples:</span> {tier.examples}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* What the AI Act Requires */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-purple" />
          <h2 className="text-lg font-bold text-navy">
            What the AI Act Requires
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {COMPLIANCE_REQUIREMENTS.map((req) => (
            <div
              key={req.title}
              className="border border-border rounded-xl p-4 bg-white"
            >
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-purple mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-navy">{req.title}</p>
                  <p className="text-xs text-text-muted mt-1">{req.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Types That Increase Risk */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-purple" />
          <h2 className="text-lg font-bold text-navy">
            AI Types That Increase Risk
          </h2>
        </div>
        <div className="border border-border rounded-xl p-5 bg-white">
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-navy">Generative AI</span>
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                Highest risk
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-navy">Computer Vision</span>
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                High risk
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-navy">Natural Language Processing</span>
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                Moderate
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-navy">Predictive Analytics</span>
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                Moderate
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-navy">Recommendation Systems</span>
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                Moderate
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-navy">Multiple AI types combined</span>
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                Compounds risk
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Fines */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-purple" />
          <h2 className="text-lg font-bold text-navy">
            Penalty Framework (Art. 99)
          </h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="border border-border rounded-xl p-4 bg-white text-center">
            <p className="text-2xl font-bold text-red-600 mb-1">EUR 35M</p>
            <p className="text-xs text-text-muted">
              or 7% of global turnover for prohibited AI practices
            </p>
          </div>
          <div className="border border-border rounded-xl p-4 bg-white text-center">
            <p className="text-2xl font-bold text-amber-600 mb-1">EUR 15M</p>
            <p className="text-xs text-text-muted">
              or 3% of turnover for other AI Act violations
            </p>
          </div>
          <div className="border border-border rounded-xl p-4 bg-white text-center">
            <p className="text-2xl font-bold text-amber-600 mb-1">EUR 7.5M</p>
            <p className="text-xs text-text-muted">
              or 1% of turnover for supplying incorrect information
            </p>
          </div>
        </div>
      </div>

      {/* Objection Handling */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-purple" />
          <h2 className="text-lg font-bold text-navy">
            Quick Objection Responses
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
              <p className="text-sm text-navy leading-relaxed">
                {o.response}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Kodex Pitch */}
      <div className="bg-purple/5 border border-purple/20 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-purple/10 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-purple" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-navy mb-2">The Kodex Pitch</h2>
            <p className="text-sm text-navy leading-relaxed mb-3">
              &ldquo;Kodex Compliance gets startups audit-ready in hours, not
              months. We handle the heavy lifting — risk classification,
              documentation, conformity assessment — so your team can focus on
              building product.&rdquo;
            </p>
            <p className="text-sm text-navy leading-relaxed">
              Share the free{" "}
              <span className="font-medium text-purple">
                EU AI Act Readiness Assessment
              </span>{" "}
              at <code className="text-xs bg-bg-muted px-1.5 py-0.5 rounded">/assess/eu-ai-act</code>{" "}
              to let prospects see their risk classification instantly. Follow up
              with a concrete compliance plan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
