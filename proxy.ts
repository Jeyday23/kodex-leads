import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const MAINTENANCE_PAGE = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kodex Leads — Maintenance</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5;color:#171717}
.box{text-align:center;max-width:420px;padding:2rem}h1{font-size:1.5rem;margin-bottom:.5rem}p{color:#737373;font-size:.95rem}</style>
</head><body><div class="box"><h1>We'll be right back</h1><p>Kodex Leads is undergoing scheduled maintenance. Please try again in a few minutes.</p></div></body></html>`;

const globalHits = new Map<string, { count: number; resetAt: number }>();
const GLOBAL_API_LIMIT = 60;
const GLOBAL_API_WINDOW = 60_000;

function getIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function globalRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = globalHits.get(ip);

  if (!entry || now > entry.resetAt) {
    globalHits.set(ip, { count: 1, resetAt: now + GLOBAL_API_WINDOW });
    return true;
  }

  entry.count++;
  return entry.count <= GLOBAL_API_LIMIT;
}

export async function proxy(request: NextRequest) {
  if (process.env.MAINTENANCE_MODE === "true") {
    const path = request.nextUrl.pathname;
    if (path.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Service temporarily unavailable" },
        { status: 503 }
      );
    }
    return new NextResponse(MAINTENANCE_PAGE, {
      status: 503,
      headers: { "Content-Type": "text/html", "Retry-After": "300" },
    });
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    const ip = getIp(request);
    if (!globalRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/api/:path*",
    "/login",
    "/auth/:path*",
    "/privacy",
    "/terms",
    "/imprint",
    "/assess/:path*",
    "/",
  ],
};
