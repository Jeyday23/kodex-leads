"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { updatePassword } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-error-message";

export default function ResetPasswordConfirmPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password);
      setUpdated(true);
    } catch (err) {
      setError(authErrorMessage(err, "Could not update password."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <p className="eyebrow">Password recovery</p>
        <h1>Choose a new password</h1>
        <p className="auth-copy">Use the password reset email link before setting a new password.</p>

        {updated ? (
          <div className="auth-status success">
            Password updated. <Link href={"/auth/login" as Route}>Sign in</Link>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              New password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            <label>
              Confirm password
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            {error ? <div className="auth-status error">{error}</div> : null}
            <button className="auth-button" type="submit" disabled={loading}>{loading ? "Updating..." : "Update password"}</button>
          </form>
        )}
      </section>
    </main>
  );
}
