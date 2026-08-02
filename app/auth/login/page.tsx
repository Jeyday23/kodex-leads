"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      setError("Supabase authentication is not configured.");
      setLoading(false);
      return;
    }
    const supabase = createClient(url, key);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next") ?? "/admin/authority/command";
    window.location.href = next;
  }

  return (
    <main className="auth-page">
      <form className="auth-panel" onSubmit={submit}>
        <p className="eyebrow">Private Kodex System</p>
        <h1>Sign in</h1>
        <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required /></label>
        <label>Password<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required /></label>
        {error ? <p className="notice">{error}</p> : null}
        <button className="authority-primary" type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
      </form>
    </main>
  );
}
