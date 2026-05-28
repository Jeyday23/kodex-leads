"use client";

import { useState } from "react";
import { ArrowRight, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Countdown } from "@/components/countdown";

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface QuizData {
  team_size: string;
  uses_ai: boolean;
  ai_types: string[];
  compliance_measures: string[];
  existing_frameworks: string[];
  name: string;
  email: string;
  company: string;
}

const TEAM_SIZES = [
  { value: "1-10", label: "1–10", sub: "Startup" },
  { value: "11-50", label: "11–50", sub: "Growing" },
  { value: "51-200", label: "51–200", sub: "Scale-up" },
  { value: "200+", label: "200+", sub: "Enterprise" },
];

const AI_TYPES = [
  "Natural Language Processing",
  "Computer Vision",
  "Recommendation Systems",
  "Generative AI",
  "Predictive Analytics",
];

const COMPLIANCE_MEASURES = [
  "AI risk assessment process",
  "Data protection impact assessment",
  "Human oversight procedures",
  "Technical documentation for AI systems",
];

const FRAMEWORKS = [
  { value: "gdpr", label: "GDPR" },
  { value: "iso27001", label: "ISO 27001" },
  { value: "soc2", label: "SOC 2" },
  { value: "nis2", label: "NIS2" },
  { value: "dora", label: "DORA" },
  { value: "none", label: "None yet" },
];

function computeRisk(data: QuizData) {
  let riskScore = 0;

  if (data.uses_ai) riskScore += 30;
  if (data.ai_types.includes("Generative AI")) riskScore += 15;
  if (data.ai_types.includes("Computer Vision")) riskScore += 10;
  if (data.ai_types.length > 2) riskScore += 10;

  const measuresGap = COMPLIANCE_MEASURES.length - data.compliance_measures.length;
  riskScore += measuresGap * 10;

  if (
    data.existing_frameworks.includes("none") ||
    data.existing_frameworks.length === 0
  )
    riskScore += 15;

  if (data.team_size === "200+") riskScore += 5;
  if (data.team_size === "51-200") riskScore += 3;

  riskScore = Math.min(100, Math.max(0, riskScore));

  let level: "high" | "limited" | "minimal";
  let classification: string;
  if (riskScore >= 60) {
    level = "high";
    classification = "High Risk";
  } else if (riskScore >= 30) {
    level = "limited";
    classification = "Limited Risk";
  } else {
    level = "minimal";
    classification = "Minimal Risk";
  }

  const finding = data.uses_ai && data.compliance_measures.length === 0
    ? "You use AI but have no compliance measures in place — this is the highest-priority gap."
    : data.uses_ai && !data.compliance_measures.includes("Technical documentation for AI systems")
    ? "Missing technical documentation is the most common cause of enforcement action under the AI Act."
    : data.existing_frameworks.includes("none")
    ? "No existing framework foundation means you're starting from scratch — but a structured 66-day plan can close the gap."
    : "Your existing compliance foundations provide a head start, but AI-specific obligations need dedicated attention.";

  return { riskScore, level, classification, finding };
}

export function EuAiActQuiz() {
  const [step, setStep] = useState<Step>(0);
  const [data, setData] = useState<QuizData>({
    team_size: "",
    uses_ai: false,
    ai_types: [],
    compliance_measures: [],
    existing_frameworks: [],
    name: "",
    email: "",
    company: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");

  const risk = computeRisk(data);

  function next() {
    setStep((s) => Math.min(6, s + 1) as Step);
  }
  function back() {
    setStep((s) => Math.max(0, s - 1) as Step);
  }

  function toggleArrayItem(
    field: "ai_types" | "compliance_measures" | "existing_frameworks",
    value: string
  ) {
    setData((prev) => {
      const arr = prev[field];
      if (field === "existing_frameworks" && value === "none") {
        return { ...prev, [field]: arr.includes("none") ? [] : ["none"] };
      }
      if (field === "existing_frameworks" && arr.includes("none")) {
        return { ...prev, [field]: [value] };
      }
      return {
        ...prev,
        [field]: arr.includes(value)
          ? arr.filter((v) => v !== value)
          : [...arr, value],
      };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!data.name || !data.email || !data.company) {
      setFormError("Please fill in all fields.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      setFormError("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          company: data.company,
          source: "assessment_eu_ai_act",
          assessment_data: {
            team_size: data.team_size,
            uses_ai: data.uses_ai,
            ai_types: data.ai_types,
            compliance_measures: data.compliance_measures,
            existing_frameworks: data.existing_frameworks,
            risk_level: risk.level,
            risk_score: risk.riskScore,
          },
        }),
      });
      if (!res.ok) throw new Error("Submit failed");
      setSubmitted(true);
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return <ResultsScreen data={data} risk={risk} />;
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col">
      <div className="h-1 bg-border">
        <div
          className="h-full bg-purple transition-all duration-500"
          style={{ width: `${((step + 1) / 7) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          {step === 0 && <StepHook onNext={next} />}
          {step === 1 && (
            <StepTeamSize
              value={data.team_size}
              onChange={(v) => setData({ ...data, team_size: v })}
              onNext={next}
              onBack={back}
            />
          )}
          {step === 2 && (
            <StepAiUsage
              usesAi={data.uses_ai}
              aiTypes={data.ai_types}
              onToggleAi={(v) =>
                setData({ ...data, uses_ai: v, ai_types: v ? data.ai_types : [] })
              }
              onToggleType={(v) => toggleArrayItem("ai_types", v)}
              onNext={next}
              onBack={back}
            />
          )}
          {step === 3 && (
            <StepCompliance
              selected={data.compliance_measures}
              onToggle={(v) => toggleArrayItem("compliance_measures", v)}
              onNext={next}
              onBack={back}
            />
          )}
          {step === 4 && (
            <StepFrameworks
              selected={data.existing_frameworks}
              onToggle={(v) => toggleArrayItem("existing_frameworks", v)}
              onNext={next}
              onBack={back}
            />
          )}
          {step === 5 && (
            <StepPreview risk={risk} onNext={next} onBack={back} />
          )}
          {step === 6 && (
            <StepGate
              data={data}
              risk={risk}
              onChange={(field, value) =>
                setData({ ...data, [field]: value })
              }
              onSubmit={handleSubmit}
              onBack={back}
              submitting={submitting}
              error={formError}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function StepHook({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center">
      <p className="text-xs font-mono uppercase tracking-widest text-teal mb-6">
        EU AI Act Readiness Assessment
      </p>
      <h1 className="text-3xl lg:text-4xl font-bold text-navy mb-4">
        Are you ready for <span className="text-purple">August 2</span>?
      </h1>
      <p className="text-text-muted mb-8 max-w-md mx-auto">
        Answer 5 quick questions. Get an instant risk classification and find
        out what the EU AI Act means for your company.
      </p>
      <div className="flex justify-center mb-10">
        <Countdown />
      </div>
      <button
        onClick={onNext}
        className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-purple text-white font-medium hover:bg-purple transition-colors"
      >
        Start Assessment <ArrowRight className="w-4 h-4" />
      </button>
      <p className="text-xs text-text-muted mt-4">Takes about 2 minutes. No signup required.</p>
    </div>
  );
}

function StepTeamSize({
  value,
  onChange,
  onNext,
  onBack,
}: {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <StepHeader num={1} total={5} question="How large is your team?" />
      <div className="grid grid-cols-2 gap-3 mb-8">
        {TEAM_SIZES.map((ts) => (
          <button
            key={ts.value}
            onClick={() => onChange(ts.value)}
            className={cn(
              "flex flex-col items-center gap-1 p-5 rounded-xl border-2 transition-all",
              value === ts.value
                ? "border-purple bg-purple-50"
                : "border-border hover:border-purple/40"
            )}
          >
            <span className="text-xl font-bold text-navy">{ts.label}</span>
            <span className="text-xs text-text-muted">{ts.sub}</span>
          </button>
        ))}
      </div>
      <NavButtons onBack={onBack} onNext={onNext} nextDisabled={!value} />
    </div>
  );
}

function StepAiUsage({
  usesAi,
  aiTypes,
  onToggleAi,
  onToggleType,
  onNext,
  onBack,
}: {
  usesAi: boolean;
  aiTypes: string[];
  onToggleAi: (v: boolean) => void;
  onToggleType: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <StepHeader
        num={2}
        total={5}
        question="Does your product use AI or machine learning?"
      />
      <div className="flex gap-3 mb-6">
        {[true, false].map((v) => (
          <button
            key={String(v)}
            onClick={() => onToggleAi(v)}
            className={cn(
              "flex-1 py-3 rounded-xl border-2 font-medium transition-all",
              usesAi === v
                ? "border-purple bg-purple-50 text-navy"
                : "border-border text-text-muted hover:border-purple/40"
            )}
          >
            {v ? "Yes" : "No"}
          </button>
        ))}
      </div>
      {usesAi && (
        <div className="mb-6">
          <p className="text-sm text-navy mb-3">
            Which types? (select all that apply)
          </p>
          <div className="flex flex-wrap gap-2">
            {AI_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => onToggleType(type)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm border transition-all",
                  aiTypes.includes(type)
                    ? "border-purple bg-purple-50 text-navy"
                    : "border-border text-text-muted hover:border-purple/40"
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      )}
      <NavButtons onBack={onBack} onNext={onNext} />
    </div>
  );
}

function StepCompliance({
  selected,
  onToggle,
  onNext,
  onBack,
}: {
  selected: string[];
  onToggle: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <StepHeader
        num={3}
        total={5}
        question="What compliance measures do you have in place?"
      />
      <div className="space-y-3 mb-8">
        {COMPLIANCE_MEASURES.map((m) => (
          <label
            key={m}
            className={cn(
              "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
              selected.includes(m)
                ? "border-purple bg-purple-50"
                : "border-border hover:border-purple/40"
            )}
          >
            <input
              type="checkbox"
              checked={selected.includes(m)}
              onChange={() => onToggle(m)}
              className="w-4 h-4 rounded border-border text-purple focus:ring-purple"
            />
            <span className="text-sm text-navy">{m}</span>
          </label>
        ))}
      </div>
      <NavButtons onBack={onBack} onNext={onNext} />
    </div>
  );
}

function StepFrameworks({
  selected,
  onToggle,
  onNext,
  onBack,
}: {
  selected: string[];
  onToggle: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <StepHeader
        num={4}
        total={5}
        question="Which compliance frameworks do you already follow?"
      />
      <div className="grid grid-cols-3 gap-3 mb-8">
        {FRAMEWORKS.map((fw) => (
          <button
            key={fw.value}
            onClick={() => onToggle(fw.value)}
            className={cn(
              "p-4 rounded-xl border-2 text-center font-medium transition-all",
              selected.includes(fw.value)
                ? "border-purple bg-purple-50 text-navy"
                : "border-border text-text-muted hover:border-purple/40"
            )}
          >
            {fw.label}
          </button>
        ))}
      </div>
      <NavButtons onBack={onBack} onNext={onNext} nextDisabled={selected.length === 0} />
    </div>
  );
}

function StepPreview({
  risk,
  onNext,
  onBack,
}: {
  risk: ReturnType<typeof computeRisk>;
  onNext: () => void;
  onBack: () => void;
}) {
  const gaugeColor =
    risk.level === "high"
      ? "#ef4444"
      : risk.level === "limited"
      ? "#f59e0b"
      : "var(--teal)";

  return (
    <div>
      <StepHeader num={5} total={5} question="Your risk preview" />
      <div className="bg-bg-muted rounded-2xl p-8 mb-8 text-center">
        <div className="relative w-40 h-20 mx-auto mb-6">
          <svg viewBox="0 0 200 100" className="w-full">
            <path
              d="M 10 90 A 80 80 0 0 1 190 90"
              fill="none"
              stroke="var(--border)"
              strokeWidth="12"
              strokeLinecap="round"
            />
            <path
              d="M 10 90 A 80 80 0 0 1 190 90"
              fill="none"
              stroke={gaugeColor}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${(risk.riskScore / 100) * 283} 283`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
            <span className="text-3xl font-bold" style={{ color: gaugeColor }}>
              {risk.riskScore}
            </span>
          </div>
        </div>
        <div
          className="inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-4"
          style={{ backgroundColor: `${gaugeColor}20`, color: gaugeColor }}
        >
          {risk.classification}
        </div>
        <p className="text-sm text-navy max-w-sm mx-auto">
          {risk.finding}
        </p>
      </div>
      <p className="text-xs text-text-muted text-center mb-6">
        This is a preview. Get the full report with your 66-day action plan.
      </p>
      <NavButtons onBack={onBack} onNext={onNext} nextLabel="Get Full Report" />
    </div>
  );
}

function StepGate({
  data,
  risk,
  onChange,
  onSubmit,
  onBack,
  submitting,
  error,
}: {
  data: QuizData;
  risk: ReturnType<typeof computeRisk>;
  onChange: (field: "name" | "email" | "company", value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  submitting: boolean;
  error: string;
}) {
  const gaugeColor =
    risk.level === "high"
      ? "#ef4444"
      : risk.level === "limited"
      ? "#f59e0b"
      : "var(--teal)";

  return (
    <div>
      <p className="text-xs font-mono uppercase tracking-widest text-teal mb-2">
        Your full report is ready
      </p>
      <h2 className="text-2xl font-bold text-navy mb-6">
        Enter your details to unlock it
      </h2>

      <div className="relative mb-8">
        <div className="absolute inset-0 backdrop-blur-sm bg-white/60 z-10 rounded-2xl" />
        <div className="bg-bg-muted rounded-2xl p-6 space-y-3 text-sm text-text-muted">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: gaugeColor }}
            />
            <span>Risk Classification: {risk.classification}</span>
          </div>
          <div className="h-3 bg-border rounded w-4/5" />
          <div className="h-3 bg-border rounded w-3/5" />
          <div className="h-3 bg-border rounded w-full" />
          <div className="h-3 bg-border rounded w-2/3" />
          <p className="font-medium text-navy">66-Day Action Plan</p>
          <div className="h-3 bg-border rounded w-full" />
          <div className="h-3 bg-border rounded w-4/5" />
          <div className="h-3 bg-border rounded w-3/4" />
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <GateField
          label="Full name"
          value={data.name}
          onChange={(v) => onChange("name", v)}
        />
        <GateField
          label="Work email"
          type="email"
          value={data.email}
          onChange={(v) => onChange("email", v)}
        />
        <GateField
          label="Company"
          value={data.company}
          onChange={(v) => onChange("company", v)}
        />

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-5 py-3 rounded-full border border-border text-sm text-text-muted hover:bg-bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={cn(
              "flex-1 inline-flex items-center justify-center gap-2",
              "px-6 py-3 rounded-full text-white font-medium text-sm",
              "bg-purple hover:bg-purple transition-colors",
              "disabled:opacity-60 disabled:cursor-not-allowed"
            )}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Unlock Full Report <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-text-muted text-center">
          Your data is processed by Kodex Compliance to deliver your report
          and may be used to contact you. See our{" "}
          <a href="/privacy" className="underline">privacy policy</a>.
        </p>
      </form>
    </div>
  );
}

function ResultsScreen({
  data,
  risk,
}: {
  data: QuizData;
  risk: ReturnType<typeof computeRisk>;
}) {
  const gaugeColor =
    risk.level === "high"
      ? "#ef4444"
      : risk.level === "limited"
      ? "#f59e0b"
      : "var(--teal)";

  const actions =
    risk.level === "high"
      ? [
          { week: "Week 1–2", task: "Complete AI system inventory and risk classification" },
          { week: "Week 3–4", task: "Draft technical documentation for all high-risk systems" },
          { week: "Week 5–6", task: "Implement human oversight procedures and monitoring" },
          { week: "Week 7–8", task: "Establish conformity assessment processes" },
          { week: "Week 9", task: "Internal audit and gap remediation" },
          { week: "Week 10", task: "Final review and compliance declaration" },
        ]
      : risk.level === "limited"
      ? [
          { week: "Week 1–2", task: "Map AI systems to EU AI Act risk categories" },
          { week: "Week 3–4", task: "Implement transparency obligations for limited-risk AI" },
          { week: "Week 5–6", task: "Document data governance and quality measures" },
          { week: "Week 7–8", task: "Set up monitoring and reporting frameworks" },
          { week: "Week 9–10", task: "Review, test, and finalize compliance posture" },
        ]
      : [
          { week: "Week 1–3", task: "Verify AI systems are correctly classified as minimal risk" },
          { week: "Week 4–6", task: "Implement voluntary code of conduct measures" },
          { week: "Week 7–10", task: "Document compliance position and monitor regulatory updates" },
        ];

  return (
    <div className="min-h-[calc(100vh-3.5rem)] py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <CheckCircle className="w-5 h-5 text-teal" />
          <p className="text-sm text-teal font-medium">
            Report sent to {data.email}
          </p>
        </div>

        <h1 className="text-3xl font-bold text-navy mb-2">
          Your EU AI Act Readiness Report
        </h1>
        <p className="text-text-muted mb-8">
          Based on your assessment for {data.company}
        </p>

        <div className="bg-bg-muted rounded-2xl p-8 mb-8">
          <div className="flex items-center gap-6">
            <div className="relative w-24 h-12 shrink-0">
              <svg viewBox="0 0 200 100" className="w-full">
                <path
                  d="M 10 90 A 80 80 0 0 1 190 90"
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth="14"
                  strokeLinecap="round"
                />
                <path
                  d="M 10 90 A 80 80 0 0 1 190 90"
                  fill="none"
                  stroke={gaugeColor}
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={`${(risk.riskScore / 100) * 283} 283`}
                />
              </svg>
            </div>
            <div>
              <div
                className="inline-block px-3 py-1 rounded-full text-sm font-medium mb-1"
                style={{ backgroundColor: `${gaugeColor}20`, color: gaugeColor }}
              >
                {risk.classification}
              </div>
              <p className="text-sm text-text-muted">Risk score: {risk.riskScore}/100</p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold text-navy mb-1">Key Finding</h2>
          <p className="text-navy">{risk.finding}</p>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold text-navy mb-4">
            66-Day Action Plan
          </h2>
          <div className="space-y-3">
            {actions.map((a) => (
              <div
                key={a.week}
                className="flex gap-4 p-4 rounded-xl border border-border"
              >
                <span className="text-sm font-mono font-bold text-teal shrink-0 w-20">
                  {a.week}
                </span>
                <span className="text-sm text-navy">{a.task}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-navy rounded-2xl p-8 text-center">
          <h3 className="text-xl font-bold text-white mb-2">
            Need help executing this plan?
          </h3>
          <p className="text-white/70 text-sm mb-6">
            Kodex Compliance gets startups audit-ready in hours, not months.
          </p>
          <a
            href="https://kodex-compliance.com"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-purple text-white font-medium hover:bg-purple transition-colors"
          >
            Talk to Kodex <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}

function StepHeader({
  num,
  total,
  question,
}: {
  num: number;
  total: number;
  question: string;
}) {
  return (
    <div className="mb-6">
      <p className="text-xs font-mono text-text-muted mb-2">
        {num} of {total}
      </p>
      <h2 className="text-2xl font-bold text-navy">{question}</h2>
    </div>
  );
}

function NavButtons({
  onBack,
  onNext,
  nextLabel = "Continue",
  nextDisabled = false,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 px-5 py-3 rounded-full border border-border text-sm text-text-muted hover:bg-bg-muted transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className={cn(
          "flex-1 inline-flex items-center justify-center gap-2",
          "px-6 py-3 rounded-full text-white font-medium text-sm",
          "bg-purple hover:bg-purple transition-colors",
          "disabled:opacity-40 disabled:cursor-not-allowed"
        )}
      >
        {nextLabel} <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function GateField({
  label,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-navy mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full px-3 py-2.5 rounded-lg border text-sm",
          "border-border bg-white text-navy",
          "focus:outline-none focus:ring-2 focus:ring-purple/30 focus:border-purple"
        )}
      />
    </div>
  );
}
