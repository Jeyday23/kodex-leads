"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SignInError, signIn } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-error-message";

const REASON_MESSAGES: Record<string, string> = {
  "signin-required": "Sign in to open the private Kodex workspace.",
  // Self-service signup creates profiles.role = "member", and no member can
  // reach /admin. Without saying so the user retries a password forever.
  "not-authorized":
    "That account does not have administrator access. New accounts are created as members — ask the Kodex operator to grant you access.",
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
      // Resolves only once /auth/signin has returned its Set-Cookie, so the
      // session is already in the cookie jar on the next line. Navigating
      // before that was what made middleware answer signin-required.
      await signIn(email, password);
      // Drop the cached server components first, then navigate, so the
      // destination is rendered with the new session rather than the
      // signed-out payload the router already holds.
      router.refresh();
      router.replace(next as Route);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      // Also on the success path. router.replace is a soft navigation, so this
      // component instance survives it, and it survives the destination
      // redirecting back to /auth/login. Clearing `loading` only in `catch`
      // left the button disabled on "Signing in..." with no way back except a
      // hard reload — the freeze users reported.
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
  // A reason from the server wins: it describes what actually happened, and
  // reuses the same copy the user would see on a redirect carrying that reason.
  if (err instanceof SignInError && err.reason && REASON_MESSAGES[err.reason]) {
    return REASON_MESSAGES[err.reason];
  }
  // Everything else goes through the shared helper, which knows that auth-js
  // reports a 5xx as the literal string "{}" and reads the status instead.
  return authErrorMessage(err, "Could not sign in.");
}
