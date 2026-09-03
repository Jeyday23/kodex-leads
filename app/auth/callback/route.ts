import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Exchanges the Supabase auth code for a cookie session. Used by email
 * confirmation and password-reset links.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?reason=missing-code`);
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/auth/login?reason=auth-unavailable`);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/auth/login?reason=invalid-code`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}

/** Only same-origin relative paths are accepted, to prevent open redirects. */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/admin/authority/command";
  return value;
}
