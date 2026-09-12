// Technical health audit for the Growth Engine site-audit module (WS2).
//
// One fetch per run, timed for TTFB, plus pure HTML parsers exported
// separately so they can be exercised on inline fixtures with no network
// (tests/growth-audit.test.ts). Never throws past runTechnicalAudit(): a
// network failure resolves to a `status: "failed"` result.

export interface CacheabilitySummary {
  cacheControl: string | null;
  etag: string | null;
  lastModified: string | null;
  cacheable: boolean;
}

export interface RenderBlockingSummary {
  blockingScriptCount: number;
  headStylesheetCount: number;
}

export type TechnicalAuditStatus = "generated" | "failed";

export interface TechnicalAuditResult {
  status: TechnicalAuditStatus;
  url: string;
  httpStatus: number | null;
  server: string | null;
  contentEncoding: string | null;
  byteSize: number | null;
  ttfbMs: number | null;
  cacheability: CacheabilitySummary;
  renderBlocking: RenderBlockingSummary;
  detail?: string;
}

/**
 * Extracts the `<head>...</head>` slice of an HTML document, case
 * insensitively. Falls back to the whole document when no `<head>` tag is
 * present so counts stay conservative rather than silently zero.
 */
function extractHead(html: string): string {
  const match = /<head[^>]*>([\s\S]*?)<\/head>/i.exec(html);
  return match ? match[1] : html;
}

/**
 * Counts `<script>` tags in the document that will block HTML parsing: those
 * with a `src` attribute and none of `async`, `defer`, or `type="module"`.
 * Inline scripts (no `src`) are not render-blocking in the same sense and are
 * excluded.
 */
export function countRenderBlockingScripts(html: string): number {
  const scriptTags = html.match(/<script\b[^>]*>/gi) ?? [];
  let count = 0;
  for (const tag of scriptTags) {
    if (!/\bsrc\s*=/i.test(tag)) continue;
    if (/\basync\b/i.test(tag)) continue;
    if (/\bdefer\b/i.test(tag)) continue;
    if (/\btype\s*=\s*["']?module["']?/i.test(tag)) continue;
    count += 1;
  }
  return count;
}

/** Counts `<link rel="stylesheet">` tags inside `<head>` only. */
export function countHeadStylesheets(html: string): number {
  const head = extractHead(html);
  const linkTags = head.match(/<link\b[^>]*>/gi) ?? [];
  return linkTags.filter((tag) => /\brel\s*=\s*["']?stylesheet["']?/i.test(tag)).length;
}

export function parseRenderBlocking(html: string): RenderBlockingSummary {
  return {
    blockingScriptCount: countRenderBlockingScripts(html),
    headStylesheetCount: countHeadStylesheets(html),
  };
}

/**
 * A response is treated as cacheable when it carries a positive max-age (or
 * `public`/`immutable`) cache-control directive, or a validator
 * (etag/last-modified) that lets a client revalidate cheaply.
 */
export function evaluateCacheability(headers: {
  cacheControl: string | null;
  etag: string | null;
  lastModified: string | null;
}): CacheabilitySummary {
  const cacheControl = headers.cacheControl;
  const hasPositiveMaxAge = cacheControl ? /max-age=(\d+)/i.exec(cacheControl)?.[1] !== "0" && /max-age=\d+/i.test(cacheControl) : false;
  const hasNoStore = cacheControl ? /\bno-store\b/i.test(cacheControl) : false;
  const hasPublicOrImmutable = cacheControl ? /\b(public|immutable)\b/i.test(cacheControl) : false;
  const hasValidator = Boolean(headers.etag || headers.lastModified);

  const cacheable = !hasNoStore && (hasPositiveMaxAge || hasPublicOrImmutable || hasValidator);

  return {
    cacheControl,
    etag: headers.etag,
    lastModified: headers.lastModified,
    cacheable,
  };
}

const FETCH_TIMEOUT_MS = 15_000;

/**
 * Fetches one URL, times TTFB (time to the first byte of the response, i.e.
 * to header receipt), and reports status, server identification, encoding,
 * byte size, cacheability, and render-blocking asset counts.
 */
export async function runTechnicalAudit(url: string): Promise<TechnicalAuditResult> {
  const empty: Omit<TechnicalAuditResult, "status" | "url" | "detail"> = {
    httpStatus: null,
    server: null,
    contentEncoding: null,
    byteSize: null,
    ttfbMs: null,
    cacheability: { cacheControl: null, etag: null, lastModified: null, cacheable: false },
    renderBlocking: { blockingScriptCount: 0, headStylesheetCount: 0 },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const startedAt = Date.now();

  let response: Response;
  try {
    response = await fetch(url, { method: "GET", signal: controller.signal, redirect: "follow" });
  } catch (error) {
    clearTimeout(timeout);
    return {
      ...empty,
      status: "failed",
      url,
      detail: `Technical audit request failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  const ttfbMs = Date.now() - startedAt;

  let html: string;
  try {
    html = await response.text();
  } catch (error) {
    clearTimeout(timeout);
    return {
      ...empty,
      status: "failed",
      url,
      httpStatus: response.status,
      ttfbMs,
      detail: `Technical audit could not read the response body: ${error instanceof Error ? error.message : String(error)}`,
    };
  } finally {
    clearTimeout(timeout);
  }

  return {
    status: "generated",
    url,
    httpStatus: response.status,
    server: response.headers.get("server"),
    contentEncoding: response.headers.get("content-encoding"),
    byteSize: Buffer.byteLength(html, "utf8"),
    ttfbMs,
    cacheability: evaluateCacheability({
      cacheControl: response.headers.get("cache-control"),
      etag: response.headers.get("etag"),
      lastModified: response.headers.get("last-modified"),
    }),
    renderBlocking: parseRenderBlocking(html),
  };
}
