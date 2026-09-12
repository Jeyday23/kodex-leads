import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/supabase/config";
import { isTrustedRequestOrigin, readOriginHeaders } from "@/lib/request-origin";

/** Supabase email codes are numeric; the length is project-configurable (6-10). */
const OTP_CODE_PATTERN = /^\d{6,10}$/;

/**
 * Step 2 of passwordless sign-in: exchange the emailed code for a session.
 *
 * Same shape as /auth/signin: the session arrives as Set-Cookie on this
 * response, so the form can navigate the moment the fetch resolves without
 * racing middleware. The admin role is resolved here too, from the profiles
 * table and never from user_metadata, so a non-admin is told it is a role
 * problem instead of being asked for another code.
 */
export async function POST(request: NextRequest) {
  const originHeaders = readOriginHeaders(request.headers);
  if (!isTrustedRequestOrigin(originHeaders, request.nextUrl.origin, process.env.NEXT_PUBLIC_SITE_URL)) {
    return NextResponse.json({ error: "Could not sign in." }, { status: 403 });
  }

  const body: unknown = await request.json().catch(() => null);
  const email = readString(body, "email").trim();
  // Codes are digits only, so whitespace from a copy-paste is safe to drop.
  const token = readString(body, "token").replace(/\s+/g, "");
  if (!email || !token) {
    return NextResponse.json({ error: "Enter your email address and the code you received." }, { status: 400 });
  }
  if (!OTP_CODE_PATTERN.test(token)) {
    return NextResponse.json({ error: "That code should be the digits from the email." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  // Fail closed: an unconfigured deployment must never appear to sign anyone in.
  if (!supabase) {
    return NextResponse.json(
      { error: "Authentication is unavailable. Contact the Kodex operator.", reason: "auth-unavailable" },
      { status: 503 },
    );
  }

  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error || !data.user) {
    return NextResponse.json(
      { error: "That code is invalid or has expired. Request a new one.", reason: "invalid-code" },
      { status: 400 },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  // Same rule as getAuthoritySession(): role comes from profiles, and the
  // default for a self-service signup is `member`, which can never reach /admin.
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
