import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isTrustedRequestOrigin, readOriginHeaders } from "@/lib/request-origin";

/**
 * Step 1 of passwordless sign-in: ask Supabase to email a one-time code.
 *
 * Runs server-side like /auth/signin so the same origin guard applies. Supabase
 * only emails a code (rather than a magic link) when the project's "Magic Link"
 * email template includes `{{ .Token }}`; see README "Authentication".
 *
 * Account enumeration: with `shouldCreateUser: false` Supabase answers
 * "Signups not allowed for otp" for an unknown address. That is folded into the
 * same `{ ok: true }` as a known address, so the form always says "check your
 * inbox" and this route cannot be used to probe which emails have accounts.
 */
export async function POST(request: NextRequest) {
  const originHeaders = readOriginHeaders(request.headers);
  if (!isTrustedRequestOrigin(originHeaders, request.nextUrl.origin, process.env.NEXT_PUBLIC_SITE_URL)) {
    return NextResponse.json({ error: "Could not send a sign-in code." }, { status: 403 });
  }

  const body: unknown = await request.json().catch(() => null);
  const email = readString(body, "email").trim();
  if (!email) {
    return NextResponse.json({ error: "Enter your email address." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  // Fail closed: an unconfigured deployment must never pretend a code was sent.
  if (!supabase) {
    return NextResponse.json(
      { error: "Authentication is unavailable. Contact the Kodex operator.", reason: "auth-unavailable" },
      { status: 503 },
    );
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    // Codes never create accounts; /auth/signup is the only way in.
    options: { shouldCreateUser: false },
  });

  if (error && !isUnknownAccountError(error.message)) {
    // Rate limits and delivery failures are passed through untouched so the
    // shared authErrorMessage mapping keeps working.
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

function isUnknownAccountError(message: string): boolean {
  return /signups not allowed/i.test(message);
}

function readString(body: unknown, key: string): string {
  if (!body || typeof body !== "object") return "";
  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}
