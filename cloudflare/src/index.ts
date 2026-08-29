const EDGE_HEALTH_PATH = "/__edge/health";
const ORIGIN_HEALTH_PATH = "/api/health";
const ORIGIN_TIMEOUT_MS = 8_000;

const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  "referrer-policy": "strict-origin-when-cross-origin",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "x-frame-options": "SAMEORIGIN",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
};

export default {
  async fetch(request, env): Promise<Response> {
    const incomingUrl = new URL(request.url);

    if (incomingUrl.pathname === EDGE_HEALTH_PATH) {
      return edgeHealthResponse(env);
    }

    return proxyToOrigin(request, env);
  },

  scheduled(controller, env, ctx): void {
    ctx.waitUntil(logOriginHealth(env, controller.cron));
  },
} satisfies ExportedHandler<Env>;

async function proxyToOrigin(request: Request, env: Env): Promise<Response> {
  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(incomingUrl.pathname + incomingUrl.search, normalizedOrigin(env));
  const headers = new Headers(request.headers);

  headers.delete("host");
  headers.set("x-forwarded-host", incomingUrl.host);
  headers.set("x-forwarded-proto", incomingUrl.protocol.replace(":", ""));

  try {
    const originResponse = await fetch(new Request(targetUrl, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? null : request.body,
      redirect: "manual",
    }));

    const responseHeaders = withSecurityHeaders(originResponse.headers);
    responseHeaders.delete("x-powered-by");

    if (isPrivatePath(incomingUrl.pathname)) {
      responseHeaders.set("cache-control", "private, no-store");
      responseHeaders.set("x-robots-tag", "noindex, nofollow");
    }

    return new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(JSON.stringify({
      event: "origin_proxy_failed",
      path: incomingUrl.pathname,
      error: errorMessage(error),
    }));

    return jsonResponse({
      status: "error",
      service: "kodex-leads-edge",
      error: "The application origin is unavailable.",
    }, 502);
  }
}

async function edgeHealthResponse(env: Env): Promise<Response> {
  const checkedAt = new Date().toISOString();
  const origin = await checkOriginHealth(env);

  return jsonResponse({
    status: origin.ok ? "ok" : "degraded",
    service: "kodex-leads-edge",
    checkedAt,
    origin,
  }, origin.ok ? 200 : 503);
}

async function checkOriginHealth(env: Env): Promise<{
  ok: boolean;
  status: number | null;
  latencyMs: number;
  error?: string;
}> {
  const startedAt = Date.now();

  try {
    const response = await fetch(new URL(ORIGIN_HEALTH_PATH, normalizedOrigin(env)), {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(ORIGIN_TIMEOUT_MS),
    });

    return {
      ok: response.ok,
      status: response.status,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      latencyMs: Date.now() - startedAt,
      error: errorMessage(error),
    };
  }
}

async function logOriginHealth(env: Env, cron: string): Promise<void> {
  const origin = await checkOriginHealth(env);
  const payload = JSON.stringify({
    event: "origin_health_check",
    cron,
    checkedAt: new Date().toISOString(),
    origin,
  });

  if (origin.ok) {
    console.log(payload);
  } else {
    console.error(payload);
  }
}

function normalizedOrigin(env: Env): URL {
  const origin = new URL(env.ORIGIN_BASE_URL);

  if (origin.protocol !== "https:") {
    throw new Error("ORIGIN_BASE_URL must use HTTPS");
  }

  origin.pathname = "/";
  origin.search = "";
  origin.hash = "";
  return origin;
}

function withSecurityHeaders(source: Headers): Headers {
  const headers = new Headers(source);

  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }

  return headers;
}

function isPrivatePath(pathname: string): boolean {
  return pathname === "/admin"
    || pathname.startsWith("/admin/")
    || pathname === "/api"
    || pathname.startsWith("/api/")
    || pathname === "/auth"
    || pathname.startsWith("/auth/");
}

function jsonResponse(payload: unknown, status: number): Response {
  const headers = withSecurityHeaders(new Headers({
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
  }));

  return new Response(JSON.stringify(payload), { status, headers });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}
