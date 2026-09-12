import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

// Delete any provider env vars up front: no test in this file may make a
// real network or LLM call.
for (const key of ["AWS_BEDROCK_ACCESS_KEY_ID", "AWS_BEDROCK_SECRET_ACCESS_KEY", "AWS_REGION", "BEDROCK_BALANCED_MODEL_ID", "ANTHROPIC_API_KEY", "CLAUDE_MODEL", "OPENAI_API_KEY", "OPENAI_MODEL", "JSEARCH_API_KEY", "ADZUNA_APP_ID", "ADZUNA_APP_KEY", "RESEND_API_KEY", "RESEND_FROM_EMAIL"]) {
  delete process.env[key];
}

import { seedBrainContextBundle } from "../lib/growth/context";
import { scoreLeadExplainably, type ExplainableScoreInput } from "../lib/growth/leads/explainable-score";
import { matchStackFingerprints } from "../lib/growth/signals/providers/stack";
import { classifyManualSignal } from "../lib/growth/signals/providers/manual";
import { dedupeSignalEvents } from "../lib/growth/signals/run-signals";
import type { SignalEventDraft } from "../lib/growth/signals/types";
import { advanceEnrollment, approveStep, isSendStep, type Enrollment, type SequenceStep } from "../lib/growth/sequences/engine";
import { canSendNow, isUnderDailyCap, isWithinSendWindow } from "../lib/growth/sequences/caps";
import type { DeliverabilityResult } from "../lib/seo/domain-deliverability";

// --- Explainable lead scoring ------------------------------------------------

test("scoreLeadExplainably is deterministic for the same input", () => {
  const input: ExplainableScoreInput = {
    personTitle: "Head of Compliance",
    companyVertical: "EU AI Act",
    geography: "EU",
    companySize: "51-200",
    signalStrength: 0.8,
    signalDetectedAt: "2026-09-01T00:00:00.000Z",
    employerRelationship: "target",
    now: "2026-09-05T00:00:00.000Z",
  };

  const first = scoreLeadExplainably(input, seedBrainContextBundle);
  const second = scoreLeadExplainably(input, seedBrainContextBundle);
  assert.deepEqual(first, second);
});

function assertFactorSumInvariant(input: ExplainableScoreInput) {
  const result = scoreLeadExplainably(input, seedBrainContextBundle);
  const sum = result.factors.reduce((total, factor) => total + factor.contribution, 0);
  const clampedSum = Math.max(0, Math.min(100, sum));
  assert.ok(
    Math.abs(clampedSum - result.confidence) <= 0.01,
    `factor contributions (${sum}) should sum to confidence (${result.confidence}) within 0.01`,
  );
}

test("scoreLeadExplainably: factor contributions sum to confidence (empty input)", () => {
  assertFactorSumInvariant({});
});

test("scoreLeadExplainably: factor contributions sum to confidence (strong match)", () => {
  assertFactorSumInvariant({
    personTitle: "Data Protection Officer",
    companyVertical: "GDPR",
    geography: "DACH",
    companySize: "1000+",
    signalStrength: 1,
    signalDetectedAt: new Date().toISOString(),
    employerRelationship: "target",
  });
});

test("scoreLeadExplainably: factor contributions sum to confidence (partial/weak match)", () => {
  assertFactorSumInvariant({
    personTitle: "Marketing Intern",
    companyVertical: "Retail",
    geography: "US",
    companySize: "1-10",
    signalStrength: 0.2,
    signalDetectedAt: "2020-01-01T00:00:00.000Z",
    employerRelationship: "competitor",
  });
});

test("scoreLeadExplainably: empty input has no positive contribution from any factor with real data to match", () => {
  const result = scoreLeadExplainably({}, seedBrainContextBundle);
  // Every factor except employer relationship requires actual data to score
  // above zero; an unset employer relationship defaults to a small "unknown"
  // ratio (0.3) rather than zero, since not knowing the relationship is not
  // the same as it being disqualifying.
  for (const factor of result.factors) {
    if (factor.factor === "Employer relationship") continue;
    assert.equal(factor.contribution, 0, `${factor.factor} should contribute 0 with no data`);
  }
  assert.ok(result.confidence > 0 && result.confidence < 5, "only the employer-relationship default should contribute");
});

test("scoreLeadExplainably: confidence is clamped within 0 and 100", () => {
  const result = scoreLeadExplainably(
    {
      personTitle: "Data Protection Officer",
      companyVertical: "EU AI Act",
      geography: "EU",
      companySize: "1000+",
      signalStrength: 1,
      signalDetectedAt: new Date().toISOString(),
      employerRelationship: "target",
    },
    seedBrainContextBundle,
  );
  assert.ok(result.confidence >= 0 && result.confidence <= 100);
});

// --- Stack fingerprint matcher -----------------------------------------------

test("matchStackFingerprints finds a Vanta trust-centre link", () => {
  const html = `<html><body><a href="https://trust.vanta.com/kodex">Trust Center</a></body></html>`;
  const matches = matchStackFingerprints(html);
  assert.ok(matches.some((match) => match.tool === "Vanta" && match.category === "trust_center"));
});

test("matchStackFingerprints finds nothing in plain HTML", () => {
  const html = `<html><body><h1>Welcome to Acme Corp</h1><p>We sell widgets.</p></body></html>`;
  const matches = matchStackFingerprints(html);
  assert.deepEqual(matches, []);
});

// --- Manual signal classifier -------------------------------------------------

test("classifyManualSignal finds a competitor mention", () => {
  const events = classifyManualSignal(
    { text: "We are currently evaluating Vanta for our SOC 2 audit prep.", url: "https://example.com/post/1" },
    seedBrainContextBundle,
  );
  const competitorEvent = events.find((event) => event.type === "competitor");
  assert.ok(competitorEvent, "expected a competitor-type event");
  assert.ok((competitorEvent!.evidence.matched as string[]).includes("Vanta"));
});

test("classifyManualSignal returns nothing for unrelated text", () => {
  const events = classifyManualSignal({ text: "Our team had a great offsite in the mountains this week." }, seedBrainContextBundle);
  assert.deepEqual(events, []);
});

// --- Dedupe -------------------------------------------------------------------

function makeEvent(dedupeKey: string): SignalEventDraft {
  return {
    type: "manual",
    source: "test",
    evidence: {},
    strength: 0.5,
    dedupeKey,
    detectedAt: new Date().toISOString(),
  };
}

test("dedupeSignalEvents collapses duplicate dedupe_key values", () => {
  const events = [makeEvent("a"), makeEvent("b"), makeEvent("a"), makeEvent("a"), makeEvent("c")];
  const { unique, duplicateCount } = dedupeSignalEvents(events);
  assert.equal(unique.length, 3);
  assert.equal(duplicateCount, 2);
  assert.deepEqual(unique.map((event) => event.dedupeKey).sort(), ["a", "b", "c"]);
});

// --- Sequence engine: approval gate -------------------------------------------

const SEND_STEPS: SequenceStep[] = [
  { id: "step-1", kind: "email", delayDays: 0 },
  { id: "step-2", kind: "message", delayDays: 2 },
];

function freshEnrollment(): Enrollment {
  return { id: "enr-1", sequenceId: "seq-1", leadRef: "lead-1", leadTable: "manual", state: "pending", timeline: [] };
}

const stubDeliverability = async (): Promise<DeliverabilityResult> => ({
  domain: "",
  verdict: "unknown",
  caution: null,
  mxHosts: [],
  checkedAt: new Date().toISOString(),
});

test("isSendStep classifies email/message/connect as send steps and visit/like as not", () => {
  assert.equal(isSendStep("email"), true);
  assert.equal(isSendStep("message"), true);
  assert.equal(isSendStep("connect"), true);
  assert.equal(isSendStep("visit"), false);
  assert.equal(isSendStep("like"), false);
});

test("advanceEnrollment never moves a send step past awaiting_approval without an explicit approve call", async () => {
  const brief = { companyName: "Acme GmbH", signalSummary: "Acme posted a DPO opening last week." };
  let enrollment = freshEnrollment();

  const first = await advanceEnrollment(SEND_STEPS, enrollment, {
    bundle: seedBrainContextBundle,
    brief,
    checkDeliverability: stubDeliverability,
  });
  enrollment = first.enrollment;

  assert.equal(enrollment.state, "awaiting_approval");
  assert.ok(first.taskToCreate, "expected a task to be created for the send step");
  assert.equal(first.taskToCreate!.status, "queued");

  // Calling advance again while awaiting approval must not create another
  // task or move the enrollment forward - only approveStep() may do that.
  const secondAttempt = await advanceEnrollment(SEND_STEPS, enrollment, {
    bundle: seedBrainContextBundle,
    brief,
    checkDeliverability: stubDeliverability,
  });
  assert.equal(secondAttempt.enrollment.state, "awaiting_approval");
  assert.equal(secondAttempt.taskToCreate, null);

  // Only the explicit approval call can move it forward.
  const approved = approveStep(enrollment, "step-1");
  assert.equal(approved.state, "active");
  assert.equal(approved.timeline.find((entry) => entry.stepId === "step-1")?.status, "approved");
});

test("approveStep throws when the enrollment is not awaiting approval", () => {
  const enrollment = freshEnrollment();
  assert.throws(() => approveStep(enrollment, "step-1"));
});

test("advanceEnrollment queues a plain task for a non-send step without an approval gate", async () => {
  const steps: SequenceStep[] = [{ id: "step-visit", kind: "visit", delayDays: 0 }];
  const enrollment = freshEnrollment();
  const result = await advanceEnrollment(steps, enrollment, {
    bundle: seedBrainContextBundle,
    brief: { companyName: "Acme GmbH", signalSummary: "Acme posted a DPO opening." },
  });
  assert.equal(result.enrollment.state, "active");
  assert.equal(result.taskToCreate?.draftCopy, null);
});

// --- Caps ---------------------------------------------------------------------

test("isWithinSendWindow rejects a time outside the configured window", () => {
  // 2026-09-14 is a Monday. 03:00 UTC is 05:00 Europe/Berlin (CEST, UTC+2).
  const earlyMorning = new Date("2026-09-14T03:00:00.000Z");
  assert.equal(isWithinSendWindow(earlyMorning, { startHour: 9, endHour: 17 }), false);
});

test("isWithinSendWindow accepts a time inside the configured window", () => {
  // 10:00 UTC is 12:00 Europe/Berlin (CEST) on a Monday.
  const midday = new Date("2026-09-14T10:00:00.000Z");
  assert.equal(isWithinSendWindow(midday, { startHour: 9, endHour: 17 }), true);
});

test("isWithinSendWindow rejects a day outside daysOfWeek", () => {
  // 2026-09-13 is a Sunday.
  const sunday = new Date("2026-09-13T10:00:00.000Z");
  assert.equal(isWithinSendWindow(sunday, { startHour: 9, endHour: 17 }), false);
});

test("isUnderDailyCap rejects once the cap is reached", () => {
  assert.equal(isUnderDailyCap(5, 10), true);
  assert.equal(isUnderDailyCap(10, 10), false);
  assert.equal(isUnderDailyCap(11, 10), false);
});

test("canSendNow rejects outside the window with an injected time", () => {
  const earlyMorning = new Date("2026-09-14T03:00:00.000Z");
  const result = canSendNow(earlyMorning, { startHour: 9, endHour: 17 }, 0, 10);
  assert.equal(result.allowed, false);
  assert.match(result.reason ?? "", /send window/);
});

test("canSendNow rejects over the daily cap with an injected time", () => {
  const midday = new Date("2026-09-14T10:00:00.000Z");
  const result = canSendNow(midday, { startHour: 9, endHour: 17 }, 10, 10);
  assert.equal(result.allowed, false);
  assert.match(result.reason ?? "", /Daily cap/);
});

test("canSendNow allows a send inside the window and under the cap", () => {
  const midday = new Date("2026-09-14T10:00:00.000Z");
  const result = canSendNow(midday, { startHour: 9, endHour: 17 }, 3, 10);
  assert.equal(result.allowed, true);
});

// --- Source-reading test: allowCron scope -------------------------------------

test("only run/discover routes carry allowCron in the growth API tree", () => {
  const root = join(process.cwd(), "app/api/growth");
  const offenders: string[] = [];

  function walk(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name === "route.ts") {
        const source = readFileSync(full, "utf8");
        if (/allowCron:\s*true/.test(source)) offenders.push(full);
      }
    }
  }
  walk(root);

  // Cron-triggered run/discover endpoints only. Data-read routes must not
  // accept the cron secret (see audit branch: "remove allowCron from audit
  // data-read routes").
  assert.deepEqual(
    offenders.map((path) => relative(process.cwd(), path)).sort(),
    [
      join("app", "api", "growth", "audit", "run", "route.ts"),
      join("app", "api", "growth", "channels", "planner", "run", "route.ts"),
      join("app", "api", "growth", "channels", "reddit", "discover", "route.ts"),
      join("app", "api", "growth", "signals", "run", "route.ts"),
    ],
  );
});
