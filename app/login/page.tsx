"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
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
          <h2 className="text-lg font-bold text-navy mb-1">
            Sign in to your dashboard
          </h2>
          <p className="text-sm text-text-muted mb-6">
            Enter your credentials to continue.
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
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className={cn(
                "w-full px-3 py-2.5 rounded-lg border text-sm",
                "border-border bg-white text-navy",
                "focus:outline-none focus:ring-2 focus:ring-purple/30 focus:border-purple"
              )}
            />
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full inline-flex items-center justify-center gap-2",
                "px-6 py-3 rounded-full text-white font-medium text-sm",
                "bg-purple hover:bg-purple transition-colors",
                "disabled:opacity-60"
              )}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Sign in <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
