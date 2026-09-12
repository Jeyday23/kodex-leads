import test from "node:test";
import assert from "node:assert/strict";

// Delete Supabase and provider env vars up front so a leaked environment can
// never turn one of these tests into a live network or database call.
for (const key of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "AWS_BEDROCK_ACCESS_KEY_ID",
  "AWS_BEDROCK_SECRET_ACCESS_KEY",
  "AWS_REGION",
  "BEDROCK_BALANCED_MODEL_ID",
  "ANTHROPIC_API_KEY",
  "CLAUDE_MODEL",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
]) {
  delete process.env[key];
}

import { seedBrainContextBundle, getBrainContextBundle } from "../lib/growth/context";
import {
  listPersonas,
  listKeywords,
  listMessagePillars,
  listObjections,
  listCompetitors,
  listInfluencers,
  listChannelVoices,
  listSignalConfigs,
  getProfile,
  createPersona,
  updatePersona,
  deletePersona,
  upsertChannelVoice,
  applyProposedBrainBundle,
} from "../lib/growth/brain/store";
import { proposedBundleSchema, seedBrainFromWebsite } from "../lib/growth/brain/seed-from-website";
import { listCompetitorNames } from "../lib/authority/store";

test("every Brain store read falls back to seed data with no Supabase configured", async () => {
  assert.deepEqual(await getProfile(), seedBrainContextBundle.profile);
  assert.deepEqual(await listPersonas(), seedBrainContextBundle.personas);
  assert.deepEqual(await listKeywords(), seedBrainContextBundle.keywords);
  assert.deepEqual(await listMessagePillars(), seedBrainContextBundle.messagePillars);
  assert.deepEqual(await listObjections(), seedBrainContextBundle.objections);
  assert.deepEqual(await listCompetitors(), seedBrainContextBundle.competitors);
  assert.deepEqual(await listInfluencers(), seedBrainContextBundle.influencers);
  assert.deepEqual(await listChannelVoices(), seedBrainContextBundle.channelVoices);
  assert.deepEqual(await listSignalConfigs(), seedBrainContextBundle.signalConfigs);
});

test("getBrainContextBundle() still equals the seed bundle with no Supabase configured", async () => {
  const bundle = await getBrainContextBundle();
  assert.deepEqual(bundle, seedBrainContextBundle);
});

test("writes without Supabase return a not-configured result and never throw", async () => {
  const created = await createPersona({ name: "Test Persona", title: "Tester" });
  assert.equal(created.ok, false);
  if (!created.ok) assert.match(created.error, /not configured/i);

  const updated = await updatePersona("any-id", { name: "New Name" });
  assert.equal(updated.ok, false);
  if (!updated.ok) assert.match(updated.error, /not configured/i);

  const deleted = await deletePersona("any-id");
  assert.equal(deleted.ok, false);
  if (!deleted.ok) assert.match(deleted.error, /not configured/i);

  const voiceResult = await upsertChannelVoice({
    channel: "linkedin",
    tone: "test",
    maxLength: 100,
    example: "test",
  });
  assert.equal(voiceResult.ok, false);
  if (!voiceResult.ok) assert.match(voiceResult.error, /not configured/i);
});

test("applyProposedBrainBundle without Supabase returns not-configured and never throws", async () => {
  const result = await applyProposedBrainBundle({
    personas: [],
    keywords: [],
    messagePillars: [],
    objections: [],
    competitors: [],
  });
  assert.equal(result.ok, false);
  assert.equal(result.created.personas, 0);
  assert.ok(result.errors.length > 0);
});

test("listCompetitorNames() in lib/authority/store.ts still works after extending the competitors table", async () => {
  const names = await listCompetitorNames();
  assert.ok(Array.isArray(names));
  assert.ok(names.length > 0);
  assert.ok(names.includes("Vanta"));
});

test("the proposed-bundle schema rejects malformed model output", () => {
  const malformed = {
    personas: [{ name: "Missing title" }],
    keywords: [{ term: "x", type: "not-a-real-type" }],
  };
  const result = proposedBundleSchema.safeParse(malformed);
  assert.equal(result.success, false);
});

test("the proposed-bundle schema accepts a minimal well-formed proposal", () => {
  const wellFormed = {
    profile: { name: "Kodex Compliance" },
    personas: [],
    keywords: [{ term: "EU AI Act", type: "product" }],
    messagePillars: [],
    objections: [],
    competitors: [],
  };
  const result = proposedBundleSchema.safeParse(wellFormed);
  assert.equal(result.success, true);
});

test("seedBrainFromWebsite never writes and returns skipped when no LLM provider is configured, without a real network call", async () => {
  const originalFetch = global.fetch;
  const fetchedUrls: string[] = [];
  try {
    global.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      fetchedUrls.push(url);
      return new Response("<html><body><h1>Kodex</h1><a href=\"/pricing\">Pricing</a></body></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    }) as typeof fetch;

    const bundle = await getBrainContextBundle();
    const result = await seedBrainFromWebsite({ url: "https://example.com" }, bundle);

    assert.equal(result.status, "skipped");
    assert.ok(result.detail && result.detail.length > 0);
    assert.ok(fetchedUrls.some((url) => url.includes("example.com")));
  } finally {
    global.fetch = originalFetch;
  }
});

test("seedBrainFromWebsite reports failed (never throws) when the homepage cannot be fetched", async () => {
  const originalFetch = global.fetch;
  try {
    global.fetch = (async () => {
      throw new Error("network unreachable");
    }) as typeof fetch;

    const bundle = await getBrainContextBundle();
    const result = await seedBrainFromWebsite({ url: "https://example.com" }, bundle);

    assert.equal(result.status, "failed");
    assert.ok(result.detail && result.detail.length > 0);
  } finally {
    global.fetch = originalFetch;
  }
});

test("seedBrainFromWebsite rejects an invalid url without making a network call", async () => {
  const originalFetch = global.fetch;
  let called = false;
  try {
    global.fetch = (async () => {
      called = true;
      throw new Error("should not be called");
    }) as typeof fetch;

    const bundle = await getBrainContextBundle();
    const result = await seedBrainFromWebsite({ url: "not a url" }, bundle);

    assert.equal(result.status, "failed");
    assert.equal(called, false);
  } finally {
    global.fetch = originalFetch;
  }
});
