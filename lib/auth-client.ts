"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin).replace(/\/+$/, "");
}

export async function signUp(email: string, password: string, fullName: string) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Confirmation links land on the callback route, which exchanges the code
      // for a cookie session before redirecting.
      emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/auth/login`,
      data: { full_name: fullName },
    },
  });

  if (error) throw error;
  return data;
}

/**
 * Carries the machine-readable reason from /auth/signin so the form can show
 * the same copy as a middleware or page-guard redirect for that reason.
 */
export class SignInError extends Error {
  readonly reason: string | null;

  constructor(message: string, reason: string | null) {
    super(message);
    this.name = "SignInError";
    this.reason = reason;
  }
}

/**
 * Signs in through the server route rather than the browser client.
 *
 * signInWithPassword() here would write the session cookies client-side, and a
 * navigation issued straight afterwards could reach middleware before the
 * cookie was committed — the Supabase SSR race that turned a correct password
 * into ?reason=signin-required. /auth/signin returns the session as Set-Cookie,
 * which the browser has applied by the time this promise resolves, so the
 * caller may navigate immediately and the request will carry the session.
 */
export async function signIn(email: string, password: string) {
  const response = await fetch("/auth/signin", {
    method: "POST",
    headers: { "content-type": "application/json" },
    // Send and accept the auth cookies for this origin.
    credentials: "same-origin",
    body: JSON.stringify({ email, password }),
  });

  const payload: unknown = await response.json().catch(() => null);
  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};

  if (!response.ok) {
    throw new SignInError(
      typeof record.error === "string" ? record.error : "Could not sign in.",
      typeof record.reason === "string" ? record.reason : null,
    );
  }

  return record;
}

/**
 * Step 1 of passwordless sign-in: requests a one-time emailed code.
 *
 * Goes through /auth/otp/request rather than the browser client for the same
 * reason signIn() does: keeping every credential exchange server-side means
 * there is exactly one place (lib/request-origin.ts) that guards it against a
 * cross-site request.
 */
export async function requestOtp(email: string) {
  const response = await fetch("/auth/otp/request", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ email }),
  });

  const payload: unknown = await response.json().catch(() => null);
  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};

  if (!response.ok) {
    throw new SignInError(
      typeof record.error === "string" ? record.error : "Could not send a sign-in code.",
      typeof record.reason === "string" ? record.reason : null,
    );
  }

  return record;
}

/**
 * Step 2 of passwordless sign-in: exchanges the emailed code for a session.
 *
 * Same Set-Cookie-before-resolve shape as signIn(): the caller may navigate as
 * soon as this promise resolves without racing middleware for the cookie.
 */
export async function verifyOtp(email: string, token: string) {
  const response = await fetch("/auth/otp/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ email, token }),
  });

  const payload: unknown = await response.json().catch(() => null);
  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};

  if (!response.ok) {
    throw new SignInError(
      typeof record.error === "string" ? record.error : "Could not sign in.",
      typeof record.reason === "string" ? record.reason : null,
    );
  }

  return record;
}

export async function resetPassword(email: string) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/auth/reset-password-confirm`,
  });

  if (error) throw error;
  return data;
}

export async function updatePassword(newPassword: string) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) throw error;
  return data;
}
