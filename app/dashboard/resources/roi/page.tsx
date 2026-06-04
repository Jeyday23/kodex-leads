"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Calculator, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const TEAM_SIZES = [
  { value: "1-10", label: "1–10", sub: "Startup" },
  { value: "11-50", label: "11–50", sub: "Growing" },
  { value: "51-200", label: "51–200", sub: "Scale-up" },
  { value: "200+", label: "200+", sub: "Enterprise" },
];

const FRAMEWORKS = [
  { value: "gdpr", label: "GDPR" },
  { value: "eu-ai-act", label: "EU AI Act" },
  { value: "iso27001", label: "ISO 27001" },
  { value: "nis2", label: "NIS2" },
  { value: "dora", label: "DORA" },
  { value: "soc2", label: "SOC 2" },
];

const APPROACHES = [
  { value: "none", label: "No compliance", desc: "No measures in place" },
  { value: "diy", label: "DIY / Internal", desc: "Handling it ourselves" },
  { value: "consultant", label: "External consultant", desc: "Hired advisors" },
];

const DATA_SENSITIVITY = [
  { value: "standard", label: "Standard data only" },
  { value: "financial", label: "Financial data" },
  { value: "health", label: "Health / biometric" },
  { value: "mixed", label: "Mixed sensitive" },
];

interface Inputs {
  teamSize: string;
  frameworks: string[];
  approach: string;
  sensitivity: string;
}

interface RoiResult {
  manualCost: number;
  kodexCost: number;
  riskExposure: number;
  annualSavings: number;
  roiMultiplier: number;
  breakEvenMonths: number;
}

function computeRoi(inputs: Inputs): RoiResult | null {
  if (!inputs.teamSize || inputs.frameworks.length === 0 || !inputs.approach || !inputs.sensitivity) {
    return null;
  }

  const teamMultiplier =
    inputs.teamSize === "200+" ? 2.5
    : inputs.teamSize === "51-200" ? 1.8
    : inputs.teamSize === "11-50" ? 1.0
    : 0.6;

  const basePerFramework = 50_000;
  const overlapDiscount = Math.max(0, (inputs.frameworks.length - 1) * 0.15);
  const effectiveFrameworks = inputs.frameworks.length * (1 - overlapDiscount);
  const manualCost = Math.round(basePerFramework * effectiveFrameworks * teamMultiplier);

  const kodexBase = 6_000;
  const kodexPerFramework = 3_000;
  const kodexCost = Math.round((kodexBase + kodexPerFramework * inputs.frameworks.length) * (teamMultiplier * 0.6));

  let fineBase =
    inputs.sensitivity === "health" || inputs.sensitivity === "mixed"
      ? 20_000_000
      : inputs.sensitivity === "financial"
      ? 15_000_000
      : 10_000_000;

  if (inputs.frameworks.includes("eu-ai-act")) {
    fineBase += 15_000_000;
  }

  const approachReduction =
    inputs.approach === "consultant" ? 0.7
    : inputs.approach === "diy" ? 0.5
    : 0.15;

  const riskExposure = Math.round(fineBase * (1 - approachReduction));

  const annualSavings = Math.max(0, manualCost - kodexCost);
  const roiMultiplier = kodexCost > 0 ? Math.round((annualSavings / kodexCost) * 10) / 10 : 0;
  const breakEvenMonths = annualSavings > 0 ? Math.max(1, Math.round((kodexCost / annualSavings) * 12)) : 0;

  return { manualCost, kodexCost, riskExposure, annualSavings, roiMultiplier, breakEvenMonths };
}

function formatEuro(n: number): string {
  if (n >= 1_000_000) return `EUR ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `EUR ${(n / 1_000).toFixed(0)}K`;
  return `EUR ${n.toFixed(0)}`;
}

export default function RoiPage() {
  const [inputs, setInputs] = useState<Inputs>({
    teamSize: "",
    frameworks: [],
    approach: "",
    sensitivity: "",
  });
  const [showResult, setShowResult] = useState(false);

  const result = computeRoi(inputs);
  const canCalculate = inputs.teamSize && inputs.frameworks.length > 0 && inputs.approach && inputs.sensitivity;

  function toggleFramework(fw: string) {
    setInputs((prev) => ({
      ...prev,
      frameworks: prev.frameworks.includes(fw)
        ? prev.frameworks.filter((f) => f !== fw)
        : [...prev.frameworks, fw],
    }));
    setShowResult(false);
  }

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
          Compliance ROI Calculator
        </h1>
        <p className="text-sm text-text-muted">
          Show prospects the cost of non-compliance vs. using Kodex
        </p>
      </div>

      <div className="space-y-6">
        {/* Team Size */}
        <div>
          <label className="block text-sm font-medium text-navy mb-3">
            Team size
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TEAM_SIZES.map((ts) => (
              <button
                key={ts.value}
                onClick={() => { setInputs({ ...inputs, teamSize: ts.value }); setShowResult(false); }}
                className={cn(
                  "flex flex-col items-center gap-1 p-4 rounded-xl border-2 transition-all",
                  inputs.teamSize === ts.value
                    ? "border-purple bg-purple-50"
                    : "border-border hover:border-purple/40"
                )}
              >
                <span className="text-lg font-bold text-navy">{ts.label}</span>
                <span className="text-xs text-text-muted">{ts.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Frameworks */}
        <div>
          <label className="block text-sm font-medium text-navy mb-3">
            Required compliance frameworks (select all that apply)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {FRAMEWORKS.map((fw) => (
              <button
                key={fw.value}
                onClick={() => toggleFramework(fw.value)}
                className={cn(
                  "p-3 rounded-xl border-2 text-sm font-medium transition-all",
                  inputs.frameworks.includes(fw.value)
                    ? "border-purple bg-purple-50 text-navy"
                    : "border-border text-text-muted hover:border-purple/40"
                )}
              >
                {fw.label}
              </button>
            ))}
          </div>
        </div>

        {/* Current Approach */}
        <div>
          <label className="block text-sm font-medium text-navy mb-3">
            Prospect&apos;s current compliance approach
          </label>
          <div className="grid sm:grid-cols-3 gap-3">
            {APPROACHES.map((a) => (
              <button
                key={a.value}
                onClick={() => { setInputs({ ...inputs, approach: a.value }); setShowResult(false); }}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all",
                  inputs.approach === a.value
                    ? "border-purple bg-purple-50"
                    : "border-border hover:border-purple/40"
                )}
              >
                <p className="text-sm font-medium text-navy">{a.label}</p>
                <p className="text-xs text-text-muted mt-0.5">{a.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Data Sensitivity */}
        <div>
          <label className="block text-sm font-medium text-navy mb-3">
            Data sensitivity level
          </label>
          <div className="grid grid-cols-2 gap-3">
            {DATA_SENSITIVITY.map((d) => (
              <button
                key={d.value}
                onClick={() => { setInputs({ ...inputs, sensitivity: d.value }); setShowResult(false); }}
                className={cn(
                  "p-3 rounded-xl border-2 text-sm font-medium transition-all",
                  inputs.sensitivity === d.value
                    ? "border-purple bg-purple-50 text-navy"
                    : "border-border text-text-muted hover:border-purple/40"
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Calculate Button */}
        {!showResult && (
          <button
            onClick={() => setShowResult(true)}
            disabled={!canCalculate}
            className={cn(
              "w-full inline-flex items-center justify-center gap-2",
              "px-6 py-3.5 rounded-full text-white font-medium",
              "bg-purple hover:bg-purple transition-colors",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            <Calculator className="w-4 h-4" />
            Calculate ROI
          </button>
        )}

        {/* Results */}
        {showResult && result && (
          <>
            {/* Headline Numbers */}
            <div className="bg-bg-muted rounded-2xl p-8">
              <p className="text-xs font-mono uppercase tracking-widest text-text-muted mb-4 text-center">
                Estimated annual comparison
              </p>
              <div className="grid sm:grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <p className="text-xs text-text-muted mb-1">Manual Compliance</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatEuro(result.manualCost)}
                  </p>
                  <p className="text-xs text-text-muted">per year</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-text-muted mb-1">With Kodex</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {formatEuro(result.kodexCost)}
                  </p>
                  <p className="text-xs text-text-muted">per year</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-text-muted mb-1">Non-Compliance Risk</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {formatEuro(result.riskExposure)}
                  </p>
                  <p className="text-xs text-text-muted">fine exposure</p>
                </div>
              </div>

              {/* Savings Bar */}
              <div className="bg-white rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-navy">Annual Savings</span>
                  <span className="text-lg font-bold text-emerald-600">
                    {formatEuro(result.annualSavings)}
                  </span>
                </div>
                <div className="h-3 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, result.manualCost > 0 ? (result.annualSavings / result.manualCost) * 100 : 0)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="border border-border rounded-xl p-5 bg-white text-center">
                <TrendingUp className="w-6 h-6 text-purple mx-auto mb-2" />
                <p className="text-3xl font-bold text-navy">{result.roiMultiplier}x</p>
                <p className="text-sm text-text-muted">ROI multiplier</p>
              </div>
              <div className="border border-border rounded-xl p-5 bg-white text-center">
                <Calculator className="w-6 h-6 text-purple mx-auto mb-2" />
                <p className="text-3xl font-bold text-navy">
                  {result.breakEvenMonths} {result.breakEvenMonths === 1 ? "month" : "months"}
                </p>
                <p className="text-sm text-text-muted">to break even</p>
              </div>
            </div>

            {/* Talking Points */}
            <div className="bg-purple/5 border border-purple/20 rounded-xl p-6">
              <h3 className="text-sm font-bold text-navy mb-3">
                How to present these numbers
              </h3>
              <ul className="space-y-2 text-sm text-navy">
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-purple mt-0.5 shrink-0" />
                  <span>
                    &ldquo;Manual compliance for {inputs.frameworks.length} framework{inputs.frameworks.length > 1 ? "s" : ""} would
                    cost approximately {formatEuro(result.manualCost)} per year in consulting and internal resources.&rdquo;
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-purple mt-0.5 shrink-0" />
                  <span>
                    &ldquo;With Kodex, you achieve the same coverage for {formatEuro(result.kodexCost)} — that&apos;s a {result.roiMultiplier}x return
                    on investment.&rdquo;
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-purple mt-0.5 shrink-0" />
                  <span>
                    &ldquo;Without compliance, your fine exposure is up
                    to {formatEuro(result.riskExposure)}. The question isn&apos;t whether you can afford compliance — it&apos;s
                    whether you can afford not to have it.&rdquo;
                  </span>
                </li>
              </ul>
            </div>

            {/* Recalculate */}
            <button
              onClick={() => setShowResult(false)}
              className="w-full py-3 rounded-full border border-border text-sm text-text-muted hover:bg-bg-muted transition-colors"
            >
              Adjust inputs and recalculate
            </button>
          </>
        )}
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-text-muted text-center">
        These estimates are for informational purposes only and do not constitute
        financial or legal advice. Actual costs vary based on company specifics,
        jurisdiction, and scope of implementation.
      </p>
    </div>
  );
}
