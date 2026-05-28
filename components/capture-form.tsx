"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowRight, CheckCircle, Loader2 } from "lucide-react";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid work email required"),
  company: z.string().min(1, "Company name is required"),
  team_size: z.enum(["1-10", "11-50", "51-200", "200+"], {
    message: "Select your team size",
  }),
  uses_ai: z.boolean(),
});

type FormData = z.infer<typeof schema>;
type FormErrors = Partial<Record<keyof FormData, string>>;

export function CaptureForm({ source = "checklist" }: { source?: string }) {
  const [data, setData] = useState<FormData>({
    name: "",
    email: "",
    company: "",
    team_size: "1-10",
    uses_ai: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const result = schema.safeParse(data);
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FormData;
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setState("loading");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...result.data, source }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      setState("success");
    } catch {
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle className="w-12 h-12 text-[#0D9488]" />
        <h3 className="text-xl font-bold text-[#0F1F3D]">
          Thanks! Check your email.
        </h3>
        <p className="text-[#7a8599] text-sm">
          We&apos;ve sent the checklist to {data.email}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field
        label="Full name"
        error={errors.name}
        value={data.name}
        onChange={(v) => setData({ ...data, name: v })}
      />
      <Field
        label="Work email"
        type="email"
        error={errors.email}
        value={data.email}
        onChange={(v) => setData({ ...data, email: v })}
      />
      <Field
        label="Company"
        error={errors.company}
        value={data.company}
        onChange={(v) => setData({ ...data, company: v })}
      />

      <div>
        <label className="block text-sm font-medium text-[#3d4a5c] mb-1.5">
          Team size
        </label>
        <select
          value={data.team_size}
          onChange={(e) =>
            setData({
              ...data,
              team_size: e.target.value as FormData["team_size"],
            })
          }
          className={cn(
            "w-full px-3 py-2.5 rounded-lg border text-sm",
            "border-[#dfe3ea] bg-white text-[#3d4a5c]",
            "focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#A855F7]"
          )}
        >
          <option value="1-10">1–10 employees</option>
          <option value="11-50">11–50 employees</option>
          <option value="51-200">51–200 employees</option>
          <option value="200+">200+ employees</option>
        </select>
        {errors.team_size && (
          <p className="text-red-500 text-xs mt-1">{errors.team_size}</p>
        )}
      </div>

      <label className="flex items-center gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={data.uses_ai}
          onChange={(e) => setData({ ...data, uses_ai: e.target.checked })}
          className="w-4 h-4 rounded border-[#dfe3ea] text-[#A855F7] focus:ring-[#A855F7]"
        />
        <span className="text-sm text-[#3d4a5c]">
          Our product uses AI / machine learning
        </span>
      </label>

      {state === "error" && (
        <p className="text-red-500 text-sm">
          Something went wrong. Please try again.
        </p>
      )}

      <button
        type="submit"
        disabled={state === "loading"}
        className={cn(
          "w-full inline-flex items-center justify-center gap-2",
          "px-6 py-3 rounded-full text-white font-medium text-sm",
          "bg-[#A855F7] hover:bg-[#9333EA] transition-colors",
          "disabled:opacity-60 disabled:cursor-not-allowed"
        )}
      >
        {state === "loading" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            Download Free Checklist <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      <p className="text-xs text-[#7a8599] text-center">
        GDPR-safe. We practice what we preach.
      </p>
    </form>
  );
}

function Field({
  label,
  type = "text",
  error,
  value,
  onChange,
}: {
  label: string;
  type?: string;
  error?: string;
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
          error ? "border-red-400" : "border-[#dfe3ea]",
          "bg-white text-[#3d4a5c]",
          "focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#A855F7]"
        )}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
