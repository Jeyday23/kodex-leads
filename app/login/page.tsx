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
    <div className="min-h-screen flex items-center justify-center bg-[#f6f7f9] px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <span className="text-xl font-bold text-[#0F1F3D]">Kodex</span>
            <span className="text-xl font-bold text-[#A855F7]">
              Leads
            </span>
          </div>
          <p className="text-sm text-[#7a8599]">Prospecting Dashboard</p>
        </div>

        <div className="bg-white border border-[#dfe3ea] rounded-xl p-8">
          {state === "sent" ? (
            <div className="text-center space-y-3">
              <CheckCircle className="w-10 h-10 text-[#0D9488] mx-auto" />
              <h2 className="text-lg font-bold text-[#0F1F3D]">
                Check your email
              </h2>
              <p className="text-sm text-[#7a8599]">
                We sent a magic link to{" "}
                <span className="font-medium text-[#3d4a5c]">{email}</span>
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold text-[#0F1F3D] mb-1">
                Sign in to your dashboard
              </h2>
              <p className="text-sm text-[#7a8599] mb-6">
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
                    "border-[#dfe3ea] bg-white text-[#3d4a5c]",
                    "focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#A855F7]"
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
                    "bg-[#A855F7] hover:bg-[#9333EA] transition-colors",
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
