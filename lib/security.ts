import { timingSafeEqual } from "crypto";

export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function validateOrigin(request: Request): boolean {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    return process.env.NODE_ENV !== "production";
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const allowed = new URL(siteUrl).origin;

  if (origin) return origin === allowed;
  if (referer) return referer.startsWith(allowed);

  return false;
}

export function requireJsonContent(request: Request): boolean {
  const ct = request.headers.get("content-type") ?? "";
  return ct.includes("application/json");
}
