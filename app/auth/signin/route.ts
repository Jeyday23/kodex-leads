import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/supabase/config";

/**
 * Server-side password sign-in.
 *
 * Signing in from the browser client wrote the session cookies client-side,
 * and the login form navigated on the next line. That is a race: the
 * navigation could reach proxy.ts before the cookie was committed, middleware
 * saw `user == null` and bounced a correct password back to
 * /auth/login?reason=signin-required while Supabase had already recorded a
 * successful last_sign_in_at. Performing the sign-in here means the session
 * arrives as Set-Cookie on this response, so the cookie is in the jar before
 * the fetch promise resolves in the browser and the following navigation
 * provably carries it. No timeout or retry is involved.
 *
 * This is the same shape as the two auth route handlers that already exist:
 * /auth/callback exchanges a code for a cookie session, /auth/signout clears
 * one. Sign-in is now the third.
 *
 * The admin role is resolved in the same request, from the profiles table and
 * never from user_metadata, so an authenticated non-admin is told it is a role
 * problem instead of being sent back to re-enter a password that was correct.
 */
export async function POST(request: NextRequest) {
  // Login CSRF guard. A cross-site form post cannot set this content type, and
  // fetch always sends Origin, so a mismatch is never our own login form.
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Could not sign in." }, { status: 403 });
  }

  const body: unknown = await request.json().catch(() => null);
  // The password is never trimmed: whitespace is part of it.
  const email = readString(body, "email").trim();
  const password = readString(body, "password");
  if (!email || !password) {
    return NextResponse.json({ error: "Enter your email address and password." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  // Fail closed: an unconfigured deployment must never appear to sign anyone in.
  if (!supabase) {
    return NextResponse.json(
      { error: "Authentication is unavailable. Contact the Kodex operator.", reason: "auth-unavailable" },
      { status: 503 },
    );
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    // Supabase's own wording is passed through untouched: the form maps
    // "Invalid login credentials" and "Email not confirmed" to friendlier copy,
    // and inventing a message here would break that mapping.
    return NextResponse.json({ error: error?.message ?? "Could not sign in." }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  // Same rule as getAuthoritySession(): role comes from profiles, and the
  // default for a self-service signup is `member`, which can never reach
  // /admin. Saying so here is the only place the user finds out before being
  // redirected in a circle.
  if (!isAdminRole(String(profile?.role ?? "member"))) {
    return NextResponse.json(
      { error: "That account does not have administrator access.", reason: "not-authorized" },
      { status: 403 },
    );
  }

  return NextResponse.json({ ok: true });
}

function readString(body: unknown, key: string): string {
  if (!body || typeof body !== "object") return "";
  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}
