"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { resetPassword } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-error-message";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      // Not err.message: auth-js stringifies the Response for a 5xx, which
      // rendered as "{}" and hid a real "Error sending recovery email".
      setError(
        authErrorMessage(
          err,
          "Kodex could not send the reset email. Email delivery may not be configured for this project.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <p className="eyebrow">Password recovery</p>
        <h1>Reset password</h1>
        <p className="auth-copy">Enter your account email and Kodex will send a password reset link.</p>

        {sent ? <div className="auth-status success">Password reset email sent. Check your inbox.</div> : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
          </label>
          {error ? <div className="auth-status error">{error}</div> : null}
          <button className="auth-button" type="submit" disabled={loading}>{loading ? "Sending..." : "Send reset email"}</button>
        </form>

        <p className="auth-alt">
          Remembered it? <Link href={"/auth/login" as Route}>Sign in</Link>
        </p>
      </section>
    </main>
  );
}
