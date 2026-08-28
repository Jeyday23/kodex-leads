import test from "node:test";
import assert from "node:assert/strict";
import {
  canAutopilotPublish,
  classifyRisk,
  dailyLimitReached,
  detectCannibalization,
  shouldPlanRevision,
  verifyClaim,
} from "../lib/authority/autonomous-ranking-policy";

test("risk classification blocks unsupported hard claims", () => {
  const result = classifyRisk({
    contentType: "deadline page",
    claims: [{ category: "deadline", verificationResult: "unsupported" }],
    pilotCompleted: false,
  });
  assert.equal(result.riskLevel, "blocked");
  assert.equal(result.approvalRequired, true);
});

test("approval policy allows low-risk guarded publishing only", () => {
  assert.equal(canAutopilotPublish("off", "low", false), false);
  assert.equal(canAutopilotPublish("draft_only", "low", false), false);
  assert.equal(canAutopilotPublish("guarded", "low", false), true);
  assert.equal(canAutopilotPublish("guarded", "high", true), false);
  assert.equal(canAutopilotPublish("controlled", "medium", false), true);
});

test("claim verification requires evidence for deadline and product claims", () => {
  const unsupported = verifyClaim({ text: "A deadline exists.", category: "deadline", sourceUrls: [] });
  assert.equal(unsupported.result, "unsupported");

  const verified = verifyClaim({
    text: "Kodex organizes evidence records.",
    category: "product_capability",
    sourceUrls: ["https://example.com/source"],
    evidence: "Source-backed product capability evidence.",
  });
  assert.equal(verified.result, "verified");
  assert.equal(verified.reviewerRequired, true);
});

test("cannibalization detection matches normalized query intent", () => {
  const matches = detectCannibalization("EU AI Act Article 50 checklist", [
    { slug: "eu-ai-act-article-50-checklist", primaryKeyword: "eu ai act article 50 checklist" },
    { slug: "nis2-evidence", primaryKeyword: "nis2 evidence requirements" },
  ]);
  assert.equal(matches.length, 1);
});

test("revision planner triggers on weak measured signals", () => {
  assert.equal(shouldPlanRevision({ impressions: 250, ctr: 0.005, baselineCtr: 0.02 }), true);
  assert.equal(shouldPlanRevision({ averagePosition: 32 }), true);
  assert.equal(shouldPlanRevision({ llmCitationLost: true }), true);
  assert.equal(shouldPlanRevision({ impressions: 20, ctr: 0.05, baselineCtr: 0.02 }), false);
});

test("daily publication limits prevent scaled publishing", () => {
  assert.equal(dailyLimitReached(3, 3), true);
  assert.equal(dailyLimitReached(2, 3), false);
});
