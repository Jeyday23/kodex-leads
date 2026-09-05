"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { signUp } from "@/lib/auth-client";

export default function SignUpPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signUp(email, password, fullName);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <p className="eyebrow">Kodex account</p>
        <h1>Create your account</h1>
        <p className="auth-copy">Get access to compliance assessments, lead routing and SEO command-center workflows.</p>

        {sent ? (
          <div className="auth-status success">
            Account created. Check your email for the confirmation link, then sign in. New accounts have member
            access; the Kodex operator grants administrator access to the private workspace.
          </div>
        ) : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Full name
            <input value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" required />
          </label>
          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          {error ? <div className="auth-status error">{error}</div> : null}
          <button className="auth-button" type="submit" disabled={loading}>{loading ? "Creating..." : "Create account"}</button>
        </form>

        <p className="auth-alt">
          Already have an account? <Link href={"/auth/login" as Route}>Sign in</Link>
        </p>
      </section>
    </main>
  );
}
