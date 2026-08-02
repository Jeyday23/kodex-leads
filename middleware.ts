import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Routes that require authentication
  const protectedRoutes = ["/admin", "/assess"];

  // Skip auth for public routes
  if (pathname.startsWith("/auth")) {
    return NextResponse.next();
  }

  // Check if route needs protection
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    // Get the session from cookies (Supabase sets auth-token)
    const authToken = request.cookies.get("sb-auth-token");

    if (!authToken) {
      // Redirect to login if no auth token
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
