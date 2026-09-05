import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAuthConfig } from "@/lib/supabase/config";

/** Page prefixes that require an authenticated session. */
const PROTECTED_PREFIXES = ["/admin"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function loginRedirect(request: NextRequest, reason: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = "/auth/login";
  url.search = "";
  url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  url.searchParams.set("reason", reason);
  return NextResponse.redirect(url);
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const protectedPath = isProtectedPath(pathname);
  const config = getSupabaseAuthConfig();

  // Fail closed: an unconfigured deployment must never serve admin pages.
  if (!config) {
    return protectedPath
      ? loginRedirect(request, "auth-unavailable")
      : NextResponse.next({ request });
  }

  // `response` is rebuilt by setAll so refreshed auth cookies reach the browser.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser() revalidates the token with Supabase. Do not swap this for
  // getSession(), which trusts unverified cookie contents.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A missing user is the only thing this check can honestly report, so
  // "signin-required" is correct here and stays. It is deliberately not a role
  // check: the role lives in the profiles table and reading it on every
  // /admin/* request would add a query that app/admin/layout.tsx already makes
  // through requireAuthorityPage(), which redirects an authenticated non-admin
  // with reason=not-authorized. The other role rejection, at sign-in time, is
  // answered by /auth/signin. Between them the user is never told to re-enter a
  // password over a role problem, which is what this used to do — not because
  // the reason was computed wrongly, but because the client-side sign-in race
  // made a freshly signed-in user look anonymous to this check.
  if (protectedPath && !user) {
    return loginRedirect(request, "signin-required");
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on every page request except static assets and image files, so the
     * auth session cookie is refreshed as the user navigates.
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|llms.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|woff|woff2|ttf)$).*)",
  ],
};
