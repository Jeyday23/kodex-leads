import test from "node:test";
import assert from "node:assert/strict";
import { createSupabaseVerifierClient, createSupabaseVerifierFetch, isValidHeaderValue, loadLocalEnvFile } from "../scripts/verify-supabase";

const SB_SECRET = "sb_secret_test_value";
const LEGACY_SERVICE_ROLE = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature";

test("sb_secret verifier requests keep apikey and remove matching Bearer secret", async () => {
  const captured: Headers[] = [];
  const fakeFetch: typeof fetch = async (_input, init) => {
    captured.push(new Headers(init?.headers));
    return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
  };

  const client = createSupabaseVerifierClient("https://example.supabase.co", SB_SECRET, fakeFetch);
  await client.from("providers").select("id").limit(1);

  assert.equal(captured[0].get("apikey"), SB_SECRET);
  assert.equal(captured[0].has("Authorization"), false);
});

test("legacy verifier requests preserve existing Bearer behavior", async () => {
  const captured: Headers[] = [];
  const fakeFetch: typeof fetch = async (_input, init) => {
    captured.push(new Headers(init?.headers));
    return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
  };

  const client = createSupabaseVerifierClient("https://example.supabase.co", LEGACY_SERVICE_ROLE, fakeFetch);
  await client.from("providers").select("id").limit(1);

  assert.equal(captured[0].get("apikey"), LEGACY_SERVICE_ROLE);
  assert.equal(captured[0].get("Authorization"), `Bearer ${LEGACY_SERVICE_ROLE}`);
});

test("verifier fetch preserves unrelated Authorization headers", async () => {
  const captured: Headers[] = [];
  const fakeFetch: typeof fetch = async (_input, init) => {
    captured.push(new Headers(init?.headers));
    return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
  };
  const verifierFetch = createSupabaseVerifierFetch(SB_SECRET, fakeFetch);

  await verifierFetch("https://example.supabase.co/rest/v1/providers", {
    headers: {
      apikey: SB_SECRET,
      Authorization: "Bearer unrelated-session-token",
    },
  });

  assert.equal(captured[0].get("apikey"), SB_SECRET);
  assert.equal(captured[0].get("Authorization"), "Bearer unrelated-session-token");
});

test("verifier fetch supports Request input and caller abort signals", async () => {
  const controller = new AbortController();
  const fakeFetch: typeof fetch = async (_input, init) => {
    assert.ok(init?.signal instanceof AbortSignal);
    setTimeout(() => controller.abort(new Error("caller cancelled")), 0);
    return new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
    });
  };
  const verifierFetch = createSupabaseVerifierFetch(SB_SECRET, fakeFetch);

  await assert.rejects(
    verifierFetch(new Request("https://example.supabase.co/rest/v1/providers", {
      headers: { apikey: SB_SECRET, Authorization: `Bearer ${SB_SECRET}` },
    }), { signal: controller.signal }),
    /caller cancelled/,
  );
});

test("timeout errors are bounded and do not contain credential material", async () => {
  const fakeFetch: typeof fetch = async (_input, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
  });
  const verifierFetch = createSupabaseVerifierFetch(SB_SECRET, fakeFetch, 5);

  await assert.rejects(
    verifierFetch("https://example.supabase.co/rest/v1/providers", {
      headers: { apikey: SB_SECRET, Authorization: `Bearer ${SB_SECRET}` },
    }),
    (error) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /timed out/);
      assert.doesNotMatch(error.message, /sb_secret/);
      assert.doesNotMatch(error.message, /Bearer/);
      return true;
    },
  );
});

test("local env loader trims carriage returns from secret keys", () => {
  const env = {} as NodeJS.ProcessEnv;
  const originalCwd = process.cwd();
  process.chdir("/tmp");
  try {
    const fs = require("node:fs") as typeof import("node:fs");
    const path = `.env.local-${Date.now()}`;
    fs.writeFileSync(path, `SUPABASE_SERVICE_ROLE_KEY=${SB_SECRET}\r\n`, "utf8");
    loadLocalEnvFile(path, env);
    fs.unlinkSync(path);
  } finally {
    process.chdir(originalCwd);
  }
  assert.equal(env.SUPABASE_SERVICE_ROLE_KEY, SB_SECRET);
});

test("invalid header characters are rejected before fetch", async () => {
  assert.equal(isValidHeaderValue("sb_secret_bad\u2026"), false);
  assert.equal(isValidHeaderValue(SB_SECRET), true);
});
