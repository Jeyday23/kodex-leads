"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ArrowRight, CheckCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "sent" | "error">(
    "idle"
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    setState(error ? "error" : "sent");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-muted px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <span className="text-xl font-bold text-navy">Kodex</span>
            <span className="text-xl font-bold text-purple">
              Leads
            </span>
          </div>
          <p className="text-sm text-text-muted">Prospecting Dashboard</p>
        </div>

        <div className="bg-white border border-border rounded-xl p-8">
          {state === "sent" ? (
            <div className="text-center space-y-3">
              <CheckCircle className="w-10 h-10 text-teal mx-auto" />
              <h2 className="text-lg font-bold text-navy">
                Check your email
              </h2>
              <p className="text-sm text-text-muted">
                We sent a magic link to{" "}
                <span className="font-medium text-navy">{email}</span>
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold text-navy mb-1">
                Sign in to your dashboard
              </h2>
              <p className="text-sm text-text-muted mb-6">
                Enter your email and we&apos;ll send you a magic link.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className={cn(
                    "w-full px-3 py-2.5 rounded-lg border text-sm",
                    "border-border bg-white text-navy",
                    "focus:outline-none focus:ring-2 focus:ring-purple/30 focus:border-purple"
                  )}
                />
                {state === "error" && (
                  <p className="text-red-500 text-sm">
                    Something went wrong. Try again.
                  </p>
                )}
                <button
                  type="submit"
                  disabled={state === "loading"}
                  className={cn(
                    "w-full inline-flex items-center justify-center gap-2",
                    "px-6 py-3 rounded-full text-white font-medium text-sm",
                    "bg-purple hover:bg-purple transition-colors",
                    "disabled:opacity-60"
                  )}
                >
                  {state === "loading" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Send magic link <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
