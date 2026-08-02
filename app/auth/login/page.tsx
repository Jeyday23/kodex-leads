"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { signIn } from "@/lib/auth-client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMessage(searchParams.get("message") ?? "");
  }, [searchParams]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn(email, password);
      router.push("/admin/leads");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-panel">
      <p className="eyebrow">Kodex account</p>
      <h1>Sign in</h1>
      <p className="auth-copy">Access admin, lead capture and SEO automation controls.</p>

      {message ? <div className="auth-status success">{message}</div> : null}

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
        </label>
        {error ? <div className="auth-status error">{error}</div> : null}
        <button className="auth-button" type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
      </form>

      <div className="auth-links">
        <Link href={"/auth/reset-password" as Route}>Forgot password?</Link>
        <Link href={"/auth/signup" as Route}>Create account</Link>
      </div>
    </section>
  );
}

export default function LoginPage() {
  return (
    <main className="auth-page">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
