import assert from "node:assert/strict";
import { test } from "node:test";
import { apiError, apiSuccess } from "../lib/authority/api";
import { summarizeAuthority } from "../lib/authority/analytics";
import { extractBrandMention, extractCitations, extractCompetitorMentions, extractionConfidence } from "../lib/authority/citation-parser";
import { calculateOpportunityScore, contentGapScore, demandLabel, isSemanticDuplicate, normalizeQuery, recommendedDecision, semanticSimilarity } from "../lib/authority/opportunity-scoring";

test("citation parser extracts and deduplicates cited URLs", () => {
  const citations = extractCitations("Kodex is cited at https://kodex-compliance.com/learn. See https://example.com/path.", [
    { title: "Kodex", url: "https://kodex-compliance.com/learn" },
  ]);

  assert.equal(citations.length, 2);
  assert.equal(citations[0].domain, "kodex-compliance.com");
  assert.equal(citations[0].citesKodex, true);
});

test("brand extraction detects positive Kodex recommendation", () => {
  const brand = extractBrandMention("Kodex is a strong shortlist option for EU AI Act readiness.");

  assert.equal(brand.mentioned, true);
  assert.equal(brand.sentiment, "positive");
  assert.ok(brand.recommendationStrength > 0.8);
});

test("competitor extraction counts named competitors", () => {
  const competitors = extractCompetitorMentions("Vanta and Drata are mentioned. Vanta appears again.", ["Vanta", "Drata", "OneTrust"]);

  assert.deepEqual(competitors.map((competitor) => competitor.citationCount), [2, 1, 0]);
});

test("authority summary calculates mention and citation rates", () => {
  const runs = [{
    id: "run-1",
    status: "completed" as const,
    startedAt: "2026-08-02T00:00:00.000Z",
    completedAt: "2026-08-02T00:00:01.000Z",
    prompt: {
      id: "prompt-1",
      projectId: "project-1",
      label: "Prompt",
      prompt: "Prompt text",
      promptGroup: "general",
      searchMode: "answer",
      country: "US",
      language: "en",
      active: true,
    },
    responses: [{
      provider: "openai" as const,
      model: "test",
      answer: "Kodex https://kodex-compliance.com",
      citations: extractCitations("Kodex https://kodex-compliance.com"),
      brand: extractBrandMention("Kodex is recommended."),
      competitors: [],
      latencyMs: 20,
      extractionConfidence: extractionConfidence("Kodex https://kodex-compliance.com", extractCitations("Kodex https://kodex-compliance.com"), extractBrandMention("Kodex is recommended.")),
    }],
  }];

  const summary = summarizeAuthority(runs);
  assert.equal(summary.mentionRate, 100);
  assert.equal(summary.citationRate, 100);
  assert.equal(summary.visibilityScore, 100);
});

test("opportunity scoring maps boundary values to decisions", () => {
  assert.equal(recommendedDecision(100), "Build");
  assert.equal(recommendedDecision(85), "Build");
  assert.equal(recommendedDecision(84), "Expand");
  assert.equal(recommendedDecision(70), "Expand");
  assert.equal(recommendedDecision(69), "Research");
  assert.equal(recommendedDecision(55), "Research");
  assert.equal(recommendedDecision(54), "Merge");
  assert.equal(recommendedDecision(40), "Merge");
  assert.equal(recommendedDecision(39), "Ignore");
});

test("opportunity scoring is deterministic and auditable", () => {
  const score = calculateOpportunityScore({
    buyerIntentScore: 100,
    productRelevanceScore: 100,
    regulatoryUrgencyScore: 80,
    demandSignalScore: 60,
    llmVisibilityGapScore: 70,
    competitorGapScore: 50,
    contentFeasibilityScore: 40,
  });

  assert.equal(score, 80);
  assert.equal(recommendedDecision(score), "Expand");
});

test("query normalization supports duplicate detection", () => {
  assert.equal(normalizeQuery(" Does my chatbot need an AI disclosure? "), "does my chatbot need an ai disclosure");
  assert.equal(normalizeQuery("Does my chatbot need an AI disclosure"), "does my chatbot need an ai disclosure");
});

test("demand labeling avoids invented search volumes", () => {
  assert.equal(demandLabel(undefined), "Unknown");
  assert.equal(demandLabel(90), "Very high");
  assert.equal(demandLabel(72), "High");
  assert.equal(demandLabel(50), "Medium");
  assert.equal(demandLabel(20), "Low");
});

test("semantic duplicate threshold behavior is deterministic", () => {
  assert.equal(isSemanticDuplicate("AI Act Article 50 checklist", "Article 50 AI Act checklist"), true);
  assert.equal(isSemanticDuplicate("AI Act Article 50 checklist", "NIS2 evidence Germany"), false);
  assert.ok(semanticSimilarity("AI disclosure chatbot", "chatbot AI disclosure") >= 0.82);
});

test("content gap detection distinguishes missing and existing content", () => {
  assert.equal(contentGapScore(false, 90), 100);
  assert.equal(contentGapScore(true, 80), 20);
});

test("API responses use consistent envelope", async () => {
  const ok = await apiSuccess({ value: 1 }).json();
  const error = await apiError("Nope", 403).json();

  assert.equal(ok.success, true);
  assert.equal(ok.data.value, 1);
  assert.equal(typeof ok.metadata.requestId, "string");
  assert.equal(error.success, false);
  assert.equal(error.error.message, "Nope");
});
