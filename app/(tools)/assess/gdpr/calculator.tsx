"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Scale,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

interface GdprInputs {
  revenue_range: string;
  data_subjects: string;
  data_categories: string[];
  cross_border: boolean;
  has_dpo: boolean;
}

const REVENUE_RANGES = [
  { value: "under-1m", label: "Under €1M", midpoint: 500_000 },
  { value: "1m-10m", label: "€1M – €10M", midpoint: 5_000_000 },
  { value: "10m-50m", label: "€10M – €50M", midpoint: 25_000_000 },
  { value: "50m-250m", label: "€50M – €250M", midpoint: 100_000_000 },
  { value: "250m-plus", label: "€250M+", midpoint: 500_000_000 },
];

const DATA_SUBJECTS_OPTIONS = [
  { value: "under-10k", label: "Under 10,000" },
  { value: "10k-100k", label: "10,000 – 100,000" },
  { value: "100k-1m", label: "100,000 – 1M" },
  { value: "1m-plus", label: "Over 1M" },
];

const DATA_CATEGORIES = [
  "Basic personal data (name, email)",
  "Financial data",
  "Health / biometric data",
  "Location / tracking data",
  "Children's data",
  "Criminal records",
];

interface FineResult {
  lowerFine: number;
  upperFine: number;
  severity: "standard" | "serious";
  factors: string[];
}

interface EnforcementCase {
  company: string;
  fine: string;
  reason: string;
  year: number;
}

function computeFine(inputs: GdprInputs): FineResult {
  const rev =
    REVENUE_RANGES.find((r) => r.value === inputs.revenue_range)?.midpoint ?? 0;
  const sensitiveCategories = [
    "Health / biometric data",
    "Children's data",
    "Criminal records",
  ];
  const hasSensitive = inputs.data_categories.some((c) =>
    sensitiveCategories.includes(c)
  );

  const severity =
    hasSensitive || inputs.data_categories.length >= 4 ? "serious" : "standard";

  const pctUpper = severity === "serious" ? 0.04 : 0.02;
  const flatCap = severity === "serious" ? 20_000_000 : 10_000_000;

  const revenueBasedFine = rev * pctUpper;
  const upperFine = Math.max(revenueBasedFine, flatCap);

  let multiplier = 0.1;
  if (inputs.cross_border) multiplier += 0.15;
  if (!inputs.has_dpo) multiplier += 0.1;
  if (inputs.data_subjects === "1m-plus") multiplier += 0.2;
  else if (inputs.data_subjects === "100k-1m") multiplier += 0.1;
  if (hasSensitive) multiplier += 0.15;

  const lowerFine = upperFine * Math.min(multiplier, 0.6);

  const factors: string[] = [];
  if (hasSensitive) factors.push("Processes special category data");
  if (inputs.cross_border) factors.push("Cross-border data transfers increase supervisory complexity");
  if (!inputs.has_dpo) factors.push("No DPO appointed — required for most processing activities at scale");
  if (inputs.data_subjects === "1m-plus") factors.push("Large-scale processing (1M+ data subjects)");
  if (inputs.data_categories.length >= 4) factors.push("Wide scope of personal data categories");

  if (factors.length === 0) factors.push("Baseline risk profile — maintain current practices");

  return { lowerFine, upperFine, severity, factors };
}

function getComparableCases(inputs: GdprInputs): EnforcementCase[] {
  const hasSensitive = inputs.data_categories.some((c) =>
    ["Health / biometric data", "Children's data"].includes(c)
  );
  const cases: EnforcementCase[] = [];

  if (hasSensitive) {
    cases.push({
      company: "Clearview AI",
      fine: "€20M",
      reason: "Unlawful processing of biometric data without consent",
      year: 2022,
    });
  }
  if (inputs.cross_border) {
    cases.push({
      company: "Meta (Facebook)",
      fine: "€1.2B",
      reason: "Unlawful EU-US data transfers under GDPR Art. 46",
      year: 2023,
    });
  }
  if (inputs.data_subjects === "1m-plus" || inputs.data_subjects === "100k-1m") {
    cases.push({
      company: "H&M",
      fine: "€35.3M",
      reason: "Excessive employee surveillance and profiling",
      year: 2020,
    });
  }

  const defaults: EnforcementCase[] = [
    {
      company: "British Airways",
      fine: "€22M",
      reason: "Insufficient security measures leading to data breach",
      year: 2020,
    },
    {
      company: "Marriott International",
      fine: "€20.4M",
      reason: "Failure to implement adequate technical measures",
      year: 2020,
    },
    {
      company: "WhatsApp Ireland",
      fine: "€225M",
      reason: "Lack of transparency in data processing disclosures",
      year: 2021,
    },
  ];

  while (cases.length < 3) {
    const next = defaults[cases.length];
    if (next && !cases.find((c) => c.company === next.company)) {
      cases.push(next);
    } else {
      break;
    }
  }

  return cases.slice(0, 3);
}

function formatEuro(n: number): string {
  if (n >= 1_000_000_000) return `€${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `€${(n / 1_000).toFixed(0)}K`;
  return `€${n.toFixed(0)}`;
}

export function GdprCalculator() {
  const [inputs, setInputs] = useState<GdprInputs>({
    revenue_range: "",
    data_subjects: "",
    data_categories: [],
    cross_border: false,
    has_dpo: false,
  });
  const [showResult, setShowResult] = useState(false);
  const [gateData, setGateData] = useState({ name: "", email: "", company: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const canCalculate = inputs.revenue_range && inputs.data_subjects;
  const result = computeFine(inputs);
  const cases = getComparableCases(inputs);

  function toggleCategory(cat: string) {
    setInputs((prev) => ({
      ...prev,
      data_categories: prev.data_categories.includes(cat)
        ? prev.data_categories.filter((c) => c !== cat)
        : [...prev.data_categories, cat],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!gateData.name || !gateData.email || !gateData.company) {
      setError("Please fill in all fields.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gateData.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: gateData.name,
          email: gateData.email,
          company: gateData.company,
          source: "assessment_gdpr",
          assessment_data: {
            ...inputs,
            fine_range: {
              lower: result.lowerFine,
              upper: result.upperFine,
            },
            severity: result.severity,
            risk_level: result.severity === "serious" ? "high" : "medium",
          },
        }),
      });
      if (!res.ok) throw new Error("Submit failed");
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      <section className="bg-[#0F1F3D] text-white py-16">
        <div className="max-w-[1080px] mx-auto px-6 lg:px-10 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-teal-500/20 text-[#0D9488] mb-4">
            <Scale className="w-6 h-6" />
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold mb-3 text-white">
            GDPR Fine Risk Calculator
          </h1>
          <p className="text-white/70 max-w-lg mx-auto">
            Estimate your potential fine exposure under Article 83. Based on real
            enforcement patterns and the two-tier penalty framework.
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-12">
        <div className="space-y-8">
          <div>
            <label className="block text-sm font-medium text-[#3d4a5c] mb-3">
              Annual revenue (approximate)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {REVENUE_RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setInputs({ ...inputs, revenue_range: r.value })}
                  className={cn(
                    "p-3 rounded-xl border-2 text-sm font-medium transition-all",
                    inputs.revenue_range === r.value
                      ? "border-[#A855F7] bg-purple-50 text-[#0F1F3D]"
                      : "border-[#dfe3ea] text-[#7a8599] hover:border-[#A855F7]/40"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#3d4a5c] mb-3">
              Number of data subjects
            </label>
            <div className="grid grid-cols-2 gap-3">
              {DATA_SUBJECTS_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setInputs({ ...inputs, data_subjects: o.value })}
                  className={cn(
                    "p-3 rounded-xl border-2 text-sm font-medium transition-all",
                    inputs.data_subjects === o.value
                      ? "border-[#A855F7] bg-purple-50 text-[#0F1F3D]"
                      : "border-[#dfe3ea] text-[#7a8599] hover:border-[#A855F7]/40"
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#3d4a5c] mb-3">
              Data categories processed (select all that apply)
            </label>
            <div className="grid sm:grid-cols-2 gap-3">
              {DATA_CATEGORIES.map((cat) => (
                <label
                  key={cat}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all",
                    inputs.data_categories.includes(cat)
                      ? "border-[#A855F7] bg-purple-50"
                      : "border-[#dfe3ea] hover:border-[#A855F7]/40"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={inputs.data_categories.includes(cat)}
                    onChange={() => toggleCategory(cat)}
                    className="w-4 h-4 rounded border-[#dfe3ea] text-[#A855F7] focus:ring-[#A855F7]"
                  />
                  <span className="text-sm text-[#3d4a5c]">{cat}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <label className="flex items-center gap-3 flex-1 p-4 rounded-xl border-2 border-[#dfe3ea] cursor-pointer hover:border-[#A855F7]/40 transition-all">
              <input
                type="checkbox"
                checked={inputs.cross_border}
                onChange={(e) =>
                  setInputs({ ...inputs, cross_border: e.target.checked })
                }
                className="w-4 h-4 rounded border-[#dfe3ea] text-[#A855F7] focus:ring-[#A855F7]"
              />
              <span className="text-sm text-[#3d4a5c]">
                Cross-border data transfers
              </span>
            </label>
            <label className="flex items-center gap-3 flex-1 p-4 rounded-xl border-2 border-[#dfe3ea] cursor-pointer hover:border-[#A855F7]/40 transition-all">
              <input
                type="checkbox"
                checked={inputs.has_dpo}
                onChange={(e) =>
                  setInputs({ ...inputs, has_dpo: e.target.checked })
                }
                className="w-4 h-4 rounded border-[#dfe3ea] text-[#A855F7] focus:ring-[#A855F7]"
              />
              <span className="text-sm text-[#3d4a5c]">
                Data Protection Officer appointed
              </span>
            </label>
          </div>

          {!showResult && (
            <button
              onClick={() => setShowResult(true)}
              disabled={!canCalculate}
              className={cn(
                "w-full inline-flex items-center justify-center gap-2",
                "px-6 py-3.5 rounded-full text-white font-medium",
                "bg-[#A855F7] hover:bg-[#9333EA] transition-colors",
                "disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              Calculate Fine Risk <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {showResult && (
            <>
              <div className="bg-[#f6f7f9] rounded-2xl p-8">
                <div className="text-center mb-6">
                  <p className="text-xs font-mono uppercase tracking-widest text-[#7a8599] mb-2">
                    Estimated fine exposure
                  </p>
                  <div className="text-3xl lg:text-4xl font-bold text-[#0F1F3D]">
                    {formatEuro(result.lowerFine)} –{" "}
                    {formatEuro(result.upperFine)}
                  </div>
                  <div
                    className={cn(
                      "inline-block mt-3 px-3 py-1 rounded-full text-sm font-medium",
                      result.severity === "serious"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    )}
                  >
                    Art. 83({result.severity === "serious" ? "5" : "4"}) —{" "}
                    {result.severity === "serious"
                      ? "Up to 4% turnover / €20M"
                      : "Up to 2% turnover / €10M"}
                  </div>
                </div>

                <div className="space-y-2">
                  {result.factors.map((f) => (
                    <div key={f} className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                      <span className="text-sm text-[#3d4a5c]">{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#0F1F3D] mb-4">
                  Comparable Enforcement Cases
                </h3>
                <div className="space-y-3">
                  {cases.map((c) => (
                    <div
                      key={c.company}
                      className="flex items-center gap-4 p-4 rounded-xl border border-[#dfe3ea]"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#0F1F3D]">
                          {c.company}{" "}
                          <span className="text-[#7a8599]">({c.year})</span>
                        </p>
                        <p className="text-xs text-[#7a8599]">{c.reason}</p>
                      </div>
                      <span className="text-lg font-bold text-red-600 shrink-0">
                        {c.fine}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {!submitted ? (
                <div className="bg-white rounded-2xl border-2 border-[#A855F7]/20 p-8">
                  <h3 className="text-lg font-bold text-[#0F1F3D] mb-1">
                    Get your full risk breakdown
                  </h3>
                  <p className="text-sm text-[#7a8599] mb-6">
                    Detailed action plan, article-by-article obligations, and
                    mitigation strategies — delivered to your inbox.
                  </p>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <GateField
                      label="Full name"
                      value={gateData.name}
                      onChange={(v) => setGateData({ ...gateData, name: v })}
                    />
                    <GateField
                      label="Work email"
                      type="email"
                      value={gateData.email}
                      onChange={(v) => setGateData({ ...gateData, email: v })}
                    />
                    <GateField
                      label="Company"
                      value={gateData.company}
                      onChange={(v) => setGateData({ ...gateData, company: v })}
                    />
                    {error && (
                      <p className="text-red-500 text-sm">{error}</p>
                    )}
                    <button
                      type="submit"
                      disabled={submitting}
                      className={cn(
                        "w-full inline-flex items-center justify-center gap-2",
                        "px-6 py-3 rounded-full text-white font-medium text-sm",
                        "bg-[#A855F7] hover:bg-[#9333EA] transition-colors",
                        "disabled:opacity-60 disabled:cursor-not-allowed"
                      )}
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          Send Full Report <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                    <p className="text-xs text-[#7a8599] text-center">
                      Your data is processed by Kodex Compliance to deliver
                      your report and may be used to contact you. See our{" "}
                      <a href="/privacy" className="underline">privacy policy</a>.
                    </p>
                  </form>
                </div>
              ) : (
                <div className="bg-[#0D9488]/10 rounded-2xl p-8 text-center">
                  <CheckCircle className="w-10 h-10 text-[#0D9488] mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-[#0F1F3D] mb-1">
                    Full report sent!
                  </h3>
                  <p className="text-sm text-[#7a8599]">
                    Check {gateData.email} for your detailed GDPR risk
                    breakdown.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </section>
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
      <label className="block text-sm font-medium text-[#3d4a5c] mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full px-3 py-2.5 rounded-lg border text-sm",
          "border-[#dfe3ea] bg-white text-[#3d4a5c]",
          "focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#A855F7]"
        )}
      />
    </div>
  );
}
