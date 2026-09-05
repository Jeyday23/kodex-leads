/**
 * Works out which origins a browser request to this app may legitimately
 * carry, for the login CSRF guard.
 *
 * Why this is not `request.nextUrl.origin`: on Render the Next server listens
 * on localhost:10000 behind a reverse proxy, so nextUrl.origin is
 * "http://localhost:10000" while the browser sends
 * Origin: https://kodex-leads-production.onrender.com. Comparing the two
 * rejected every real sign-in with 403 before the password was ever checked,
 * which locked the only account out of production. The public origin is only
 * knowable from the forwarding headers the proxy sets.
 */

export type OriginHeaders = {
  origin: string | null;
  forwardedHost: string | null;
  forwardedProto: string | null;
  host: string | null;
};

export function readOriginHeaders(headers: {
  get(name: string): string | null;
}): OriginHeaders {
  return {
    origin: headers.get("origin"),
    // A proxy chain sends a comma-separated list; the first entry is the client-facing one.
    forwardedHost: headers.get("x-forwarded-host"),
    forwardedProto: headers.get("x-forwarded-proto"),
    host: headers.get("host"),
  };
}

function firstValue(header: string | null): string | null {
  if (!header) return null;
  const first = header.split(",")[0]?.trim();
  return first ? first : null;
}

function normalize(origin: string): string {
  return origin.trim().replace(/\/+$/, "").toLowerCase();
}

/** Every origin this deployment can legitimately be reached on. */
export function trustedOrigins(headers: OriginHeaders, nextUrlOrigin: string, siteUrl?: string | null): string[] {
  const origins = new Set<string>();

  // What the proxy says the browser asked for. This is the one that matters in production.
  const forwardedHost = firstValue(headers.forwardedHost);
  if (forwardedHost) {
    const proto = firstValue(headers.forwardedProto) ?? "https";
    origins.add(normalize(`${proto}://${forwardedHost}`));
  }

  // Direct hit with no proxy in front (local dev, or a health check).
  const host = firstValue(headers.host);
  if (host) {
    const proto = firstValue(headers.forwardedProto) ?? (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
    origins.add(normalize(`${proto}://${host}`));
  }

  if (nextUrlOrigin) origins.add(normalize(nextUrlOrigin));
  if (siteUrl) origins.add(normalize(siteUrl));

  return [...origins];
}

/**
 * True when the request may proceed. A missing Origin header is allowed: it is
 * what non-browser clients send, and the guard exists for cross-site *browser*
 * form posts, which always carry one.
 */
export function isTrustedRequestOrigin(
  headers: OriginHeaders,
  nextUrlOrigin: string,
  siteUrl?: string | null,
): boolean {
  if (!headers.origin) return true;
  return trustedOrigins(headers, nextUrlOrigin, siteUrl).includes(normalize(headers.origin));
}
