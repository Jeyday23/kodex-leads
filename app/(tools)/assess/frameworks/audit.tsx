"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Layers,
  Loader2,
  CheckCircle,
  ArrowDownToLine,
} from "lucide-react";

interface Framework {
  id: string;
  label: string;
  controls: number;
  description: string;
}

const FRAMEWORKS: Framework[] = [
  { id: "gdpr", label: "GDPR", controls: 87, description: "EU data protection regulation" },
  { id: "eu-ai-act", label: "EU AI Act", controls: 42, description: "AI-specific risk obligations" },
  { id: "iso27001", label: "ISO 27001", controls: 93, description: "Information security management" },
  { id: "nis2", label: "NIS2", controls: 45, description: "Network and information security" },
  { id: "dora", label: "DORA", controls: 38, description: "Digital operational resilience" },
  { id: "soc2", label: "SOC 2", controls: 61, description: "Trust services criteria" },
];

const OVERLAP_MAP: Record<string, Record<string, number>> = {
  gdpr: { "eu-ai-act": 18, iso27001: 34, nis2: 22, dora: 15, soc2: 28 },
  "eu-ai-act": { gdpr: 18, iso27001: 12, nis2: 8, dora: 6, soc2: 10 },
  iso27001: { gdpr: 34, "eu-ai-act": 12, nis2: 28, dora: 20, soc2: 42 },
  nis2: { gdpr: 22, "eu-ai-act": 8, iso27001: 28, dora: 18, soc2: 15 },
  dora: { gdpr: 15, "eu-ai-act": 6, iso27001: 20, nis2: 18, soc2: 12 },
  soc2: { gdpr: 28, "eu-ai-act": 10, iso27001: 42, nis2: 15, dora: 12 },
};

function computeAudit(selected: string[]) {
  if (selected.length < 2)
    return { totalControls: 0, overlapping: 0, unique: 0, effortReduction: 0 };

  const frameworks = FRAMEWORKS.filter((f) => selected.includes(f.id));
  const totalControls = frameworks.reduce((sum, f) => sum + f.controls, 0);

  let overlapping = 0;
  const counted = new Set<string>();
  for (let i = 0; i < selected.length; i++) {
    for (let j = i + 1; j < selected.length; j++) {
      const key = `${selected[i]}-${selected[j]}`;
      if (!counted.has(key)) {
        counted.add(key);
        overlapping += OVERLAP_MAP[selected[i]]?.[selected[j]] ?? 0;
      }
    }
  }

  overlapping = Math.min(overlapping, Math.floor(totalControls * 0.6));
  const unique = totalControls - overlapping;
  const effortReduction = totalControls > 0 ? Math.round((overlapping / totalControls) * 100) : 0;

  return { totalControls, overlapping, unique, effortReduction };
}

export function StackAudit() {
  const [selected, setSelected] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [gateData, setGateData] = useState({ name: "", email: "", company: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const audit = computeAudit(selected);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
    setShowResult(false);
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
          source: "assessment_frameworks",
          assessment_data: {
            selected_frameworks: selected,
            total_controls: audit.totalControls,
            overlapping_controls: audit.overlapping,
            unique_obligations: audit.unique,
            effort_reduction_pct: audit.effortReduction,
            risk_level: audit.effortReduction > 30 ? "medium" : "high",
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
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-navy/50 text-white/80 mb-4">
            <Layers className="w-6 h-6" />
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold mb-3 text-white">
            Compliance Stack Audit
          </h1>
          <p className="text-white/70 max-w-lg mx-auto">
            Select the frameworks you need. See which controls overlap and how
            much implementation effort you can save.
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-12">
        <div className="space-y-8">
          <div>
            <label className="block text-sm font-medium text-[#3d4a5c] mb-3">
              Select your required frameworks (at least 2)
            </label>
            <div className="grid sm:grid-cols-2 gap-3">
              {FRAMEWORKS.map((fw) => (
                <button
                  key={fw.id}
                  onClick={() => toggle(fw.id)}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all",
                    selected.includes(fw.id)
                      ? "border-[#A855F7] bg-purple-50"
                      : "border-[#dfe3ea] hover:border-[#A855F7]/40"
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0",
                      selected.includes(fw.id)
                        ? "bg-[#A855F7] text-white"
                        : "bg-[#f6f7f9] text-[#7a8599]"
                    )}
                  >
                    {fw.controls}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#0F1F3D]">
                      {fw.label}
                    </p>
                    <p className="text-xs text-[#7a8599]">{fw.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {!showResult && (
            <button
              onClick={() => setShowResult(true)}
              disabled={selected.length < 2}
              className={cn(
                "w-full inline-flex items-center justify-center gap-2",
                "px-6 py-3.5 rounded-full text-white font-medium",
                "bg-[#A855F7] hover:bg-[#9333EA] transition-colors",
                "disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              Analyze Overlap <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {showResult && selected.length >= 2 && (
            <>
              <div className="bg-[#f6f7f9] rounded-2xl p-8">
                <div className="grid grid-cols-3 gap-6 text-center mb-6">
                  <div>
                    <p className="text-3xl font-bold text-[#0F1F3D]">
                      {audit.totalControls}
                    </p>
                    <p className="text-xs text-[#7a8599] mt-1">Total Controls</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-[#A855F7]">
                      {audit.overlapping}
                    </p>
                    <p className="text-xs text-[#7a8599] mt-1">Overlapping</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-[#0D9488]">
                      {audit.effortReduction}%
                    </p>
                    <p className="text-xs text-[#7a8599] mt-1">Effort Saved</p>
                  </div>
                </div>

                <div className="h-4 bg-[#dfe3ea] rounded-full overflow-hidden">
                  <div className="h-full flex">
                    <div
                      className="bg-[#A855F7] transition-all duration-700"
                      style={{
                        width: `${(audit.overlapping / audit.totalControls) * 100}%`,
                      }}
                    />
                    <div
                      className="bg-[#0D9488] transition-all duration-700"
                      style={{
                        width: `${(audit.unique / audit.totalControls) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="flex gap-4 mt-3 text-xs text-[#7a8599]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#A855F7]" />
                    Shared controls ({audit.overlapping})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0D9488]" />
                    Unique obligations ({audit.unique})
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#0F1F3D] mb-3">
                  What this means
                </h3>
                <p className="text-sm text-[#3d4a5c] leading-relaxed">
                  By implementing{" "}
                  {selected
                    .map((id) => FRAMEWORKS.find((f) => f.id === id)?.label)
                    .join(", ")}{" "}
                  together, you can reuse{" "}
                  <strong>{audit.overlapping} overlapping controls</strong>{" "}
                  instead of building them separately. That&apos;s a{" "}
                  <strong>{audit.effortReduction}% reduction</strong> in
                  implementation effort compared to treating each framework
                  independently.
                </p>
              </div>

              {!submitted ? (
                <div className="bg-white rounded-2xl border-2 border-[#A855F7]/20 p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <ArrowDownToLine className="w-5 h-5 text-[#A855F7]" />
                    <h3 className="text-lg font-bold text-[#0F1F3D]">
                      Download control mapping
                    </h3>
                  </div>
                  <p className="text-sm text-[#7a8599] mb-6">
                    Get a detailed control-by-control mapping showing exactly
                    which requirements overlap across your selected frameworks.
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
                      onChange={(v) =>
                        setGateData({ ...gateData, company: v })
                      }
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
                          Send Control Mapping <ArrowRight className="w-4 h-4" />
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
                    Control mapping sent!
                  </h3>
                  <p className="text-sm text-[#7a8599]">
                    Check {gateData.email} for your detailed framework mapping.
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
