import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateQuality, publishingDecision } from "../lib/seo/quality-gate";
import { normalizeLeadAttribution } from "../lib/seo/attribution";
import { scoreLead } from "../lib/seo/lead-scoring";
import { pathForSeoPage } from "../lib/seo/urls";
import { daysUntilDeadline, getNextDeadline } from "../lib/seo/deadlines";
import { deriveTopicGraph } from "../lib/seo/topic-graph";

test("quality gate publishes strong factual pages", () => {
  const result = evaluateQuality({
    authoritativeSources: 2,
    unsupportedClaims: 0,
    similarityScore: 0.1,
    internalLinks: 3,
    hasConversionAction: true,
    hasCanonical: true,
    datesValidated: true,
    hasParentHub: true,
    legalInterpretation: false,
  });

  assert.equal(result.score, 100);
  assert.equal(result.decision, "publish");
  assert.equal(result.noindex, false);
});

test("quality gate queues legal interpretation despite a strong score", () => {
  assert.equal(publishingDecision(95, true), "review");
});

test("quality gate rejects weak unsupported content", () => {
  const result = evaluateQuality({
    authoritativeSources: 1,
    unsupportedClaims: 2,
    similarityScore: 0.82,
    internalLinks: 1,
    hasConversionAction: false,
    hasCanonical: false,
    datesValidated: false,
    hasParentHub: false,
    hasPenaltyClaims: true,
    penaltyClaimsSourced: false,
  });

  assert.equal(result.decision, "reject");
  assert.equal(result.noindex, true);
  assert.ok(result.blockers.length >= 6);
});

test("SEO route builder creates compliance URL families", () => {
  assert.equal(pathForSeoPage({ pageType: "learn", framework: "eu-ai-act", slug: "high-risk-obligations" }), "/learn/eu-ai-act/high-risk-obligations");
  assert.equal(pathForSeoPage({ pageType: "compare", framework: "gdpr", slug: "vanta-vs-kodex" }), "/compare/vanta-vs-kodex");
  assert.equal(pathForSeoPage({ pageType: "deadline", framework: "eu-ai-act", slug: "eu-ai-act" }), "/deadlines/eu-ai-act");
  assert.equal(pathForSeoPage({ pageType: "enforcement", framework: "nis2", slug: "readiness-signals" }), "/enforcement/nis2/readiness-signals");
});

test("lead attribution preserves first touch and refreshes last touch", () => {
  const attribution = normalizeLeadAttribution({
    landingPage: "/learn/eu-ai-act/high-risk-obligations",
    contentId: "00000000-0000-4000-8000-000000000001",
    firstTouchAt: "2026-07-01T00:00:00.000Z",
  });

  assert.equal(attribution.landing_page, "/learn/eu-ai-act/high-risk-obligations");
  assert.equal(attribution.content_id, "00000000-0000-4000-8000-000000000001");
  assert.equal(attribution.first_touch_at, "2026-07-01T00:00:00.000Z");
  assert.match(attribution.last_touch_at, /^2026-|^2027-|^2028-|^2029-|^2030-/);
});

test("lead scoring marks urgent high-risk AI prospects as sales-ready", () => {
  const result = scoreLead({
    email: "buyer@example.com",
    companyName: "Example Corp",
    framework: "eu-ai-act",
    companySize: "201-1000",
    aiUse: "high-risk",
    complianceMaturity: "starting",
    urgency: "immediate",
    landingPage: "/learn/eu-ai-act/high-risk-obligations",
  });

  assert.equal(result.grade, "sales-ready");
  assert.equal(result.recommendedAction, "book-demo");
  assert.ok(result.score >= 82);
});

test("deadline helper picks the next compliance deadline", () => {
  const next = getNextDeadline(new Date("2026-07-31T12:00:00.000Z"));
  assert.equal(next?.id, "eu-ai-act-high-risk");
  assert.equal(daysUntilDeadline("2026-08-02T00:00:00.000Z", new Date("2026-07-31T12:00:00.000Z")), 2);
});

test("topic graph derives compliance topics from source changes", () => {
  const topics = deriveTopicGraph([
    {
      name: "EU Artificial Intelligence Act",
      url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689",
      status: "changed",
      contentHash: "abc123",
    },
  ], []);

  assert.ok(topics.some((topic) => topic.framework === "eu-ai-act"));
  assert.ok(topics.every((topic) => !topic.targetTool.includes("/assess/seo")));
});
