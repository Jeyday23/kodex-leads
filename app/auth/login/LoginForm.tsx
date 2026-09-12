"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SignInError, requestOtp, signIn, verifyOtp } from "@/lib/auth-client";
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

type AuthMode = "password" | "otp";

export function LoginForm({ next, reason }: { next: string; reason: string | null }) {
  const router = useRouter();
  const notice = reason ? REASON_MESSAGES[reason] : null;

  const [mode, setMode] = useState<AuthMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  // Two OTP steps share one panel: "request" shows the email field and sends
  // the code, "verify" shows the code field and asks for a fresh email if the
  // user goes back rather than silently reusing whatever is in state.
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request");
  const [otpSentTo, setOtpSentTo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function switchMode(next: AuthMode) {
    setMode(next);
    setError("");
    setOtpStep("request");
    setCode("");
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
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
      setError(toMessage(err, "Could not sign in."));
    } finally {
      // Also on the success path. router.replace is a soft navigation, so this
      // component instance survives it, and it survives the destination
      // redirecting back to /auth/login. Clearing `loading` only in `catch`
      // left the button disabled on "Signing in..." with no way back except a
      // hard reload — the freeze users reported.
      setLoading(false);
    }
  }

  async function handleOtpRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await requestOtp(email);
      // /auth/otp/request answers the same way for a known and an unknown
      // address, so this step never reveals which accounts exist.
      setOtpSentTo(email);
      setOtpStep("verify");
    } catch (err) {
      setError(toMessage(err, "Could not send a sign-in code."));
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await verifyOtp(otpSentTo, code);
      router.refresh();
      router.replace(next as Route);
    } catch (err) {
      setError(toMessage(err, "Could not sign in."));
    } finally {
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

        <div className="auth-mode-toggle" role="tablist" aria-label="Sign-in method">
          <button type="button" role="tab" aria-current={mode === "password"} onClick={() => switchMode("password")}>
            Password
          </button>
          <button type="button" role="tab" aria-current={mode === "otp"} onClick={() => switchMode("otp")}>
            Email code
          </button>
        </div>

        {mode === "password" ? (
          <form className="auth-form" onSubmit={handlePasswordSubmit}>
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
        ) : otpStep === "request" ? (
          <form className="auth-form" onSubmit={handleOtpRequest}>
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
            {error ? <div className="auth-status error">{error}</div> : null}
            <button className="auth-button" type="submit" disabled={loading}>
              {loading ? "Sending code..." : "Send sign-in code"}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleOtpVerify}>
            <div className="auth-status success">Code sent to {otpSentTo}. Check your inbox.</div>
            <label>
              Code
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                required
                autoFocus
              />
            </label>
            {error ? <div className="auth-status error">{error}</div> : null}
            <button className="auth-button" type="submit" disabled={loading}>
              {loading ? "Verifying..." : "Verify and sign in"}
            </button>
            <button
              type="button"
              className="auth-alt"
              style={{ background: "none", border: 0, cursor: "pointer", padding: 0, textAlign: "left" }}
              onClick={() => setOtpStep("request")}
              disabled={loading}
            >
              Use a different email or resend the code
            </button>
          </form>
        )}

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

function toMessage(err: unknown, fallback: string): string {
  // A reason from the server wins: it describes what actually happened, and
  // reuses the same copy the user would see on a redirect carrying that reason.
  if (err instanceof SignInError && err.reason && REASON_MESSAGES[err.reason]) {
    return REASON_MESSAGES[err.reason];
  }
  if (err instanceof SignInError && err.message) {
    return err.message;
  }
  // Everything else goes through the shared helper, which knows that auth-js
  // reports a 5xx as the literal string "{}" and reads the status instead.
  return authErrorMessage(err, fallback);
}
