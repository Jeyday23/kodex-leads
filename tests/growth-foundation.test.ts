import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

// Delete any provider env vars up front so a leaked environment can never
// turn one of these tests into a live network call.
const PROVIDER_ENV_VARS = [
  "AWS_BEDROCK_ACCESS_KEY_ID",
  "AWS_BEDROCK_SECRET_ACCESS_KEY",
  "AWS_REGION",
  "BEDROCK_BALANCED_MODEL_ID",
  "ANTHROPIC_API_KEY",
  "CLAUDE_MODEL",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
];
for (const key of PROVIDER_ENV_VARS) delete process.env[key];

import { generateText, generateJson, getGrowthLlmStatus } from "../lib/growth/llm";
import {
  seedBrainContextBundle,
  getChannelVoice,
  renderBrainContext,
  type GrowthChannel,
} from "../lib/growth/context";

const CHANNELS: GrowthChannel[] = ["linkedin", "x", "reddit", "articles", "email"];
const REQUIRED_BANNED_TERMS = ["—", "game-changer", "unlock", "delve", "seamless"];

test("getGrowthLlmStatus reports every provider unconfigured with no env vars", () => {
  const status = getGrowthLlmStatus();
  assert.equal(status.configured, false);
  assert.equal(status.preferred, null);
  assert.equal(status.providers.length, 3);
  for (const provider of status.providers) {
    assert.equal(provider.configured, false);
    assert.ok(provider.missing.length > 0, `${provider.id} should list missing env vars`);
  }
});

test("generateText returns skipped with no providers configured and does not throw", async () => {
  const result = await generateText({ system: "sys", prompt: "hello" });
  assert.equal(result.status, "skipped");
  assert.equal(result.provider, null);
  assert.equal(result.text, "");
  assert.ok(result.detail && result.detail.length > 0);
});

const SimpleSchema = z.object({ ok: z.boolean() });

test("generateJson returns failed (never throws) for non-JSON text", async () => {
  process.env.ANTHROPIC_API_KEY = "test-key";
  process.env.CLAUDE_MODEL = "test-model";
  const originalFetch = global.fetch;
  try {
    global.fetch = (async () =>
      new Response(JSON.stringify({ content: [{ type: "text", text: "this is not json at all" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })) as typeof fetch;

    const result = await generateJson({ system: "sys", prompt: "give me json" }, SimpleSchema);
    assert.equal(result.status, "failed");
  } finally {
    global.fetch = originalFetch;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CLAUDE_MODEL;
  }
});

test("generateJson returns failed (never throws) for schema-invalid JSON", async () => {
  process.env.ANTHROPIC_API_KEY = "test-key";
  process.env.CLAUDE_MODEL = "test-model";
  const originalFetch = global.fetch;
  try {
    global.fetch = (async () =>
      new Response(JSON.stringify({ content: [{ type: "text", text: '{"ok": "not-a-boolean"}' }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })) as typeof fetch;

    const result = await generateJson({ system: "sys", prompt: "give me json" }, SimpleSchema);
    assert.equal(result.status, "failed");
  } finally {
    global.fetch = originalFetch;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CLAUDE_MODEL;
  }
});

test("generateJson extracts JSON from a fenced code block", async () => {
  process.env.ANTHROPIC_API_KEY = "test-key";
  process.env.CLAUDE_MODEL = "test-model";
  const originalFetch = global.fetch;
  try {
    const fenced = "Here is the result:\n```json\n{\"ok\": true}\n```\nLet me know if that helps.";
    global.fetch = (async () =>
      new Response(JSON.stringify({ content: [{ type: "text", text: fenced }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })) as typeof fetch;

    const result = await generateJson({ system: "sys", prompt: "give me json" }, SimpleSchema);
    assert.equal(result.status, "generated");
    if (result.status === "generated") {
      assert.deepEqual(result.value, { ok: true });
    }
  } finally {
    global.fetch = originalFetch;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CLAUDE_MODEL;
  }
});

test("renderBrainContext with channel linkedin includes linkedin voice and excludes reddit voice", () => {
  const linkedinVoice = getChannelVoice(seedBrainContextBundle, "linkedin");
  const redditVoice = getChannelVoice(seedBrainContextBundle, "reddit");

  const rendered = renderBrainContext(seedBrainContextBundle, { channel: "linkedin" });

  assert.ok(rendered.includes(linkedinVoice.tone));
  assert.ok(!rendered.includes(redditVoice.tone));
});

test("renderBrainContext omitting channel includes no voice example", () => {
  const rendered = renderBrainContext(seedBrainContextBundle);
  for (const channel of CHANNELS) {
    const voice = getChannelVoice(seedBrainContextBundle, channel);
    assert.ok(!rendered.includes(voice.example), `should not include ${channel} example`);
  }
});

test("renderBrainContext sections filtering works", () => {
  const profileOnly = renderBrainContext(seedBrainContextBundle, { sections: ["profile"] });
  assert.ok(profileOnly.includes(seedBrainContextBundle.profile.name));
  assert.ok(!profileOnly.includes("Keywords:"));
  assert.ok(!profileOnly.includes("Competitors:"));

  const keywordsOnly = renderBrainContext(seedBrainContextBundle, { sections: ["keywords"] });
  assert.ok(keywordsOnly.includes("Keywords:"));
  assert.ok(!keywordsOnly.includes(seedBrainContextBundle.profile.name));
});

test("seed bundle has at least one entry in every category and all five channel voices", () => {
  assert.ok(seedBrainContextBundle.personas.length >= 1);
  assert.ok(seedBrainContextBundle.keywords.length >= 1);
  assert.ok(seedBrainContextBundle.messagePillars.length >= 1);
  assert.ok(seedBrainContextBundle.objections.length >= 1);
  assert.ok(seedBrainContextBundle.competitors.length >= 1);
  assert.ok(seedBrainContextBundle.influencers.length >= 1);
  assert.ok(seedBrainContextBundle.signalConfigs.length >= 1);
  for (const channel of CHANNELS) {
    assert.ok(seedBrainContextBundle.channelVoices[channel], `missing voice for ${channel}`);
  }
});

test("every seed voice bans the em dash and the four required phrases", () => {
  for (const channel of CHANNELS) {
    const voice = getChannelVoice(seedBrainContextBundle, channel);
    for (const term of REQUIRED_BANNED_TERMS) {
      assert.ok(voice.bannedTerms.includes(term), `${channel} voice should ban "${term}"`);
    }
  }
});

test("rendered output contains no em dash for every channel and with no channel", () => {
  const noChannel = renderBrainContext(seedBrainContextBundle);
  assert.ok(!noChannel.includes("—"));

  for (const channel of CHANNELS) {
    const rendered = renderBrainContext(seedBrainContextBundle, { channel });
    assert.ok(!rendered.includes("—"), `${channel} render should not contain an em dash`);
  }
});
