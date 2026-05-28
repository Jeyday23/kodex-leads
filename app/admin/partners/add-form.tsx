"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Plus, Loader2, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function AddPartnerForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [form, setForm] = useState({
    name: "",
    email: "",
    code: "",
    commission_rate: "0.15",
    role: "partner",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");

    try {
      const supabase = createClient();

      const { error } = await supabase.from("partners").insert({
        name: form.name,
        email: form.email,
        code: form.code.toUpperCase(),
        commission_rate: parseFloat(form.commission_rate),
        role: form.role,
      });

      if (error) throw error;

      setState("success");
      setTimeout(() => {
        setOpen(false);
        setState("idle");
        setForm({ name: "", email: "", code: "", commission_rate: "0.15", role: "partner" });
        router.refresh();
      }, 1500);
    } catch {
      setState("error");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-lg",
          "border border-border text-sm text-navy",
          "hover:border-purple hover:text-purple transition-colors"
        )}
      >
        <Plus className="w-4 h-4" /> Add Partner
      </button>
    );
  }

  if (state === "success") {
    return (
      <div className="border border-emerald-200 rounded-xl p-6 bg-emerald-50 flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-emerald-600" />
        <span className="text-sm text-emerald-700">Partner created.</span>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl p-6 bg-white">
      <h3 className="font-bold text-navy mb-4">Add New Partner</h3>
      <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
        <input
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          className="px-3 py-2 rounded-lg border border-border text-sm"
        />
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
          className="px-3 py-2 rounded-lg border border-border text-sm"
        />
        <input
          placeholder="Referral code (e.g. ALEX25)"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          required
          className="px-3 py-2 rounded-lg border border-border text-sm font-mono uppercase"
        />
        <input
          type="number"
          step="0.01"
          min="0"
          max="1"
          placeholder="Commission rate (e.g. 0.15)"
          value={form.commission_rate}
          onChange={(e) =>
            setForm({ ...form, commission_rate: e.target.value })
          }
          required
          className="px-3 py-2 rounded-lg border border-border text-sm"
        />
        <div className="sm:col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={state === "loading"}
            className={cn(
              "inline-flex items-center gap-2 px-5 py-2 rounded-full",
              "bg-purple text-white text-sm font-medium",
              "hover:bg-purple transition-colors disabled:opacity-60"
            )}
          >
            {state === "loading" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Create Partner"
            )}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-sm text-text-muted hover:text-navy"
          >
            Cancel
          </button>
          {state === "error" && (
            <span className="text-sm text-red-500">
              Failed. Check that the code is unique.
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
