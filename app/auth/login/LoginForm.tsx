"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "@/lib/auth-client";

const REASON_MESSAGES: Record<string, string> = {
  "signin-required": "Sign in to open the private Kodex workspace.",
  "not-authorized": "That account does not have administrator access.",
  "auth-unavailable": "Authentication is unavailable. Contact the Kodex operator.",
  "signed-out": "You have been signed out.",
  "invalid-code": "That link has expired. Sign in again to continue.",
  "missing-code": "That link was incomplete. Sign in again to continue.",
};

export function LoginForm({ next, reason }: { next: string; reason: string | null }) {
  const router = useRouter();
  const notice = reason ? REASON_MESSAGES[reason] : null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn(email, password);
      // Server components must re-read the new cookie session.
      router.replace(next as Route);
      router.refresh();
    } catch (err) {
      setError(toMessage(err));
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <p className="eyebrow">Kodex workspace</p>
        <h1>Sign in</h1>
        <p className="auth-copy">This workspace is private. Administrator access is required.</p>

        {notice ? <div className="auth-status">{notice}</div> : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error ? <div className="auth-status error">{error}</div> : null}
          <button className="auth-button" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="auth-alt">
          <Link href={"/auth/reset-password" as Route}>Forgot password?</Link>
        </p>
        <p className="auth-alt">
          No account yet? <Link href={"/auth/signup" as Route}>Create one</Link>
        </p>
      </section>
    </main>
  );
}

function toMessage(err: unknown): string {
  if (!(err instanceof Error)) return "Could not sign in.";
  // Supabase returns this verbatim when the account exists but is unconfirmed.
  if (/email not confirmed/i.test(err.message)) {
    return "Confirm your email address first. Check your inbox for the confirmation link.";
  }
  if (/invalid login credentials/i.test(err.message)) {
    return "Incorrect email or password.";
  }
  return err.message;
}
