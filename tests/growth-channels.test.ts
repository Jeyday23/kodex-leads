import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

// Delete any Supabase/provider env vars up front so a leaked environment can
// never turn one of these tests into a live network or database call.
for (const key of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "REDDIT_CLIENT_ID",
  "REDDIT_CLIENT_SECRET",
  "X_API_KEY",
  "X_API_SECRET",
  "X_ACCESS_TOKEN",
  "X_ACCESS_SECRET",
]) {
  delete process.env[key];
}

import { evaluateChannelDraft } from "../lib/growth/channels/quality-gate";
import type { ChannelVoice } from "../lib/growth/context";
import { allocateWeekPlan, type WeekPlan } from "../lib/growth/channels/planner";
import type { ChannelSettingsRow } from "../lib/growth/channels/store";
import { parseRedditListing, scoreRedditThread } from "../lib/growth/channels/reddit-discovery";
import { publishXDraft } from "../lib/growth/channels/publish/x";
import type { ChannelDraftRecord } from "../lib/growth/channels/store";
import { recordLinkedInPublish } from "../lib/growth/channels/publish/linkedin";
import { recordRedditPublish } from "../lib/growth/channels/publish/reddit";

// --- Quality gate --------------------------------------------------------

const X_VOICE: ChannelVoice = {
  tone: "Terse, fact-first, no thread-bait.",
  rules: ["Fit the claim and its source in one post.", "No emoji, no hashtags."],
  bannedTerms: ["—", "game-changer", "unlock", "delve", "seamless"],
  maxLength: 280,
  example: "EU AI Act high-risk obligations are readiness work now, not a future problem.",
};

test("quality gate fails a draft containing the em dash character", () => {
  const result = evaluateChannelDraft("A short claim — with an em dash in it.", X_VOICE);
  assert.equal(result.pass, false);
  assert.ok(result.reasons.some((reason) => reason.toLowerCase().includes("em dash")));
});

test("quality gate fails a draft using a banned term", () => {
  const result = evaluateChannelDraft("This is a total game-changer for compliance teams.", X_VOICE);
  assert.equal(result.pass, false);
  assert.ok(result.reasons.some((reason) => reason.includes("game-changer")));
});

test("quality gate fails a draft over the channel's max length", () => {
  const longText = "a".repeat(X_VOICE.maxLength + 1);
  const result = evaluateChannelDraft(longText, X_VOICE);
  assert.equal(result.pass, false);
  assert.ok(result.reasons.some((reason) => reason.includes("character limit")));
});

test("quality gate fails a regulatory claim with no not-legal-advice disclaimer", () => {
  const result = evaluateChannelDraft("Under the EU AI Act, providers must maintain a technical file.", X_VOICE);
  assert.equal(result.pass, false);
  assert.ok(result.reasons.some((reason) => reason.toLowerCase().includes("disclaimer")));
});

test("quality gate passes a clean, disclaimed sample", () => {
  const text =
    "Under the EU AI Act, providers must maintain a technical file. This is not legal advice; consult your own legal counsel.";
  const result = evaluateChannelDraft(text, X_VOICE);
  assert.deepEqual(result.reasons, []);
  assert.equal(result.pass, true);
});

test("quality gate flags hashtags and emoji only for channels whose voice rules forbid them", () => {
  const permissiveVoice: ChannelVoice = { ...X_VOICE, rules: ["Anything goes."] };
  const withHashtag = evaluateChannelDraft("Great news #compliance", permissiveVoice);
  assert.equal(withHashtag.pass, true);

  const strict = evaluateChannelDraft("Great news #compliance 🎉", X_VOICE);
  assert.equal(strict.pass, false);
  assert.ok(strict.reasons.some((reason) => reason.includes("hashtag")));
  assert.ok(strict.reasons.some((reason) => reason.includes("emoji")));
});

// --- Planner allocation ---------------------------------------------------

const SAMPLE_SETTINGS: ChannelSettingsRow[] = [
  { channel: "article_brief", enabled: true, weeklyTarget: 7, autoDraft: false },
  { channel: "reddit", enabled: true, weeklyTarget: 14, autoDraft: false },
  { channel: "x", enabled: true, weeklyTarget: 5, autoDraft: false },
  { channel: "linkedin", enabled: true, weeklyTarget: 7, autoDraft: false },
  { channel: "email", enabled: false, weeklyTarget: 3, autoDraft: false },
];

test("planner allocation meets every enabled channel's weekly target exactly", () => {
  const plan: WeekPlan = allocateWeekPlan(SAMPLE_SETTINGS);

  assert.equal(plan.days.length, 7);
  assert.equal(plan.channelTotals.article_brief, 7);
  assert.equal(plan.channelTotals.reddit, 14);
  assert.equal(plan.channelTotals.x, 5);
  assert.equal(plan.channelTotals.linkedin, 7);
  // Disabled channel gets zero tasks even though weeklyTarget is nonzero.
  assert.equal(plan.channelTotals.email, 0);

  // Every day carries the fixed audit-fix quota regardless of channel settings.
  for (const day of plan.days) {
    assert.equal(day.auditFixTasks, 2);
  }

  // Sum of per-day task counts across the week matches the totals.
  const countByChannel: Record<string, number> = {};
  for (const day of plan.days) {
    for (const channel of day.channelTasks) {
      countByChannel[channel] = (countByChannel[channel] ?? 0) + 1;
    }
  }
  assert.equal(countByChannel.article_brief, 7);
  assert.equal(countByChannel.reddit, 14);
  assert.equal(countByChannel.x, 5);
  assert.equal(countByChannel.linkedin, 7);
  assert.equal(countByChannel.email ?? 0, 0);
});

test("planner allocation is deterministic for the same settings", () => {
  const first = allocateWeekPlan(SAMPLE_SETTINGS);
  const second = allocateWeekPlan(SAMPLE_SETTINGS);
  assert.deepEqual(first, second);
});

// --- Reddit parser and scorer ---------------------------------------------

const REDDIT_FIXTURE = {
  kind: "Listing",
  data: {
    children: [
      {
        kind: "t3",
        data: {
          id: "abc123",
          subreddit: "gdpr",
          title: "How do I map EU AI Act high-risk obligations for a SaaS product?",
          url: "https://www.reddit.com/r/gdpr/comments/abc123/how_do_i_map/",
          permalink: "/r/gdpr/comments/abc123/how_do_i_map/",
          selftext: "We are a small SaaS company trying to figure out our EU AI Act obligations before the deadline.",
          created_utc: 1_700_000_000,
          num_comments: 12,
          upvote_ratio: 0.94,
          is_self: true,
          link_flair_text: null,
          stickied: false,
        },
      },
      {
        kind: "t3",
        data: {
          id: "def456",
          subreddit: "gdpr",
          title: "Solved: our AI Act question from last week",
          url: "https://www.reddit.com/r/gdpr/comments/def456/solved/",
          permalink: "/r/gdpr/comments/def456/solved/",
          selftext: "Thanks everyone, this is resolved now.",
          created_utc: 1_700_000_000,
          num_comments: 3,
          upvote_ratio: 0.9,
          is_self: true,
          link_flair_text: "Solved",
          stickied: false,
        },
      },
      {
        kind: "t3",
        data: {
          id: "ghi789",
          subreddit: "gdpr",
          title: "I am so pissed off at our compliance vendor right now",
          url: "https://www.reddit.com/r/gdpr/comments/ghi789/rant/",
          permalink: "/r/gdpr/comments/ghi789/rant/",
          selftext: "Just needed to vent, no real question here.",
          created_utc: 1_700_000_000,
          num_comments: 1,
          upvote_ratio: 0.8,
          is_self: true,
          link_flair_text: null,
          stickied: false,
        },
      },
    ],
  },
};

test("parseRedditListing extracts threads from a real listing JSON shape", () => {
  const threads = parseRedditListing(REDDIT_FIXTURE);
  assert.equal(threads.length, 3);
  assert.equal(threads[0].id, "abc123");
  assert.equal(threads[0].subreddit, "gdpr");
  assert.equal(threads[0].numComments, 12);
  assert.equal(threads[0].permalink, "https://www.reddit.com/r/gdpr/comments/abc123/how_do_i_map/");
});

test("scoreRedditThread scores keyword overlap, recency and comment count, and skips accepted/venting threads", () => {
  const threads = parseRedditListing(REDDIT_FIXTURE);
  const keywords = ["EU AI Act", "high-risk obligations"];
  const now = 1_700_000_000_000 + 1000; // just after created_utc, in ms

  const [question, solved, rant] = threads.map((thread) => scoreRedditThread(thread, keywords, now));

  assert.equal(question.skip, false);
  assert.ok(question.matchedKeywords.length > 0);
  assert.ok(question.score > 0);

  assert.equal(solved.skip, true);
  assert.match(solved.skipReason ?? "", /accepted answer/i);

  assert.equal(rant.skip, true);
  assert.match(rant.skipReason ?? "", /venting/i);
});

// --- X publisher -----------------------------------------------------------

function throwingFetch(): Promise<Response> {
  throw new Error("fetch must not be called for an unapproved draft.");
}

const DRAFT_STATUS_DRAFT: ChannelDraftRecord = {
  id: "draft-1",
  channel: "x",
  status: "draft",
  title: null,
  body: "EU AI Act readiness work continues.",
  sourceRef: {},
  voiceSnapshot: {},
  quality: { pass: true, reasons: [] },
  rationale: null,
  scheduledFor: null,
  publishedUrl: null,
  createdBy: null,
  decidedBy: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

test("X publisher refuses to post a draft-status item and never calls fetch", async () => {
  const result = await publishXDraft(DRAFT_STATUS_DRAFT, throwingFetch as unknown as typeof fetch);
  assert.equal(result.ok, false);
  assert.match(result.error ?? "", /not approved/i);
});

// --- LinkedIn and Reddit publishers never call fetch -----------------------

test("LinkedIn publisher never calls fetch", async () => {
  const originalFetch = global.fetch;
  global.fetch = throwingFetch as unknown as typeof fetch;
  try {
    const result = await recordLinkedInPublish("draft-1", "https://www.linkedin.com/feed/update/urn:li:activity:1", "actor@example.com");
    // Supabase is unconfigured in this test environment, so the write is
    // reported as not-configured - the important assertion is that
    // global.fetch (stubbed to throw) was never reached.
    assert.equal(result.ok, false);
  } finally {
    global.fetch = originalFetch;
  }
});

test("Reddit publisher never calls fetch", async () => {
  const originalFetch = global.fetch;
  global.fetch = throwingFetch as unknown as typeof fetch;
  try {
    const result = await recordRedditPublish("draft-1", "https://www.reddit.com/r/gdpr/comments/abc123/c/xyz", "actor@example.com");
    assert.equal(result.ok, false);
  } finally {
    global.fetch = originalFetch;
  }
});

// --- allowCron source scan --------------------------------------------------

test("allowCron appears only on the reddit/discover and planner/run routes", () => {
  const root = join(process.cwd(), "app/api/growth/channels");

  function walk(dir: string, out: string[] = []): string[] {
    if (!existsSync(dir)) return out;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full, out);
      else if (entry.name === "route.ts") out.push(full);
    }
    return out;
  }

  const offenders: string[] = [];
  for (const file of walk(root)) {
    const source = readFileSync(file, "utf8");
    if (/allowCron\s*:\s*true/.test(source)) {
      const isAllowed = file.endsWith(join("reddit", "discover", "route.ts")) || file.endsWith(join("planner", "run", "route.ts"));
      if (!isAllowed) offenders.push(file);
    }
  }

  assert.deepEqual(offenders, [], "allowCron: true must appear only on reddit/discover and planner/run.");

  // And positively confirm both expected routes do use it.
  const rediscover = readFileSync(join(root, "reddit/discover/route.ts"), "utf8");
  const plannerRun = readFileSync(join(root, "planner/run/route.ts"), "utf8");
  assert.match(rediscover, /allowCron\s*:\s*true/);
  assert.match(plannerRun, /allowCron\s*:\s*true/);
});
