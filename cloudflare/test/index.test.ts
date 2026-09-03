import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/index";

const env = {
  ORIGIN_BASE_URL: "https://kodex-leads-it6d.onrender.com",
} as Env;

test("edge health checks the Render origin", { concurrency: false }, async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";

  globalThis.fetch = async (input) => {
    requestedUrl = input instanceof Request ? input.url : String(input);
    return Response.json({ status: "ok" });
  };

  try {
    const response = await worker.fetch(new Request("https://edge.example/__edge/health"), env);
    const body = await response.json() as { status: string; origin: { ok: boolean } };

    assert.equal(response.status, 200);
    assert.equal(body.status, "ok");
    assert.equal(body.origin.ok, true);
    assert.equal(requestedUrl, "https://kodex-leads-it6d.onrender.com/api/health");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("private routes are proxied without edge caching", { concurrency: false }, async () => {
  const originalFetch = globalThis.fetch;
  let proxiedUrl = "";

  globalThis.fetch = async (input) => {
    proxiedUrl = input instanceof Request ? input.url : String(input);
    return new Response("admin", {
      headers: { "cache-control": "public, max-age=3600", "x-powered-by": "Next.js" },
    });
  };

  try {
    const response = await worker.fetch(new Request("https://edge.example/admin/authority?view=command"), env);

    assert.equal(proxiedUrl, "https://kodex-leads-it6d.onrender.com/admin/authority?view=command");
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
    assert.equal(response.headers.get("x-powered-by"), null);
    assert.equal(await response.text(), "admin");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
