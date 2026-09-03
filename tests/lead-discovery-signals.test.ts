import test from "node:test";
import assert from "node:assert/strict";
import {
  extractCompanyFromEnforcementTitle,
  extractFineAmount,
  scoreDecisionMaker,
  shouldRunPaidEnrichment,
} from "../lib/seo/lead-discovery";

test("enforcement parser extracts a named company without inventing one", () => {
  assert.equal(
    extractCompanyFromEnforcementTitle("The Italian Supervisory Authority has fined Verisure Italia for unlawful processing of personal data"),
    "Verisure Italia",
  );
  assert.equal(
    extractCompanyFromEnforcementTitle("Italian SA fined Poste Vita for data breach"),
    "Poste Vita",
  );
});

test("enforcement parser rejects anonymous company wording", () => {
  assert.equal(
    extractCompanyFromEnforcementTitle("Italian Supervisory Authority fined a company 120 000 EUR for tracking five employees"),
    null,
  );
});

test("fine amount parser recognizes EUR and euro-symbol amounts", () => {
  assert.equal(extractFineAmount("Authority fined Example GmbH 120 000 EUR for violations"), "120 000 EUR");
  assert.equal(extractFineAmount("Authority fined Example GmbH €2.5 million after an investigation"), "€2.5 million");
  assert.equal(extractFineAmount("Authority issued a warning to Example GmbH"), null);
});

test("decision-maker ranking prioritizes privacy and compliance ownership", () => {
  assert.ok(scoreDecisionMaker("Data Protection Officer") > scoreDecisionMaker("Chief Technology Officer"));
  assert.ok(scoreDecisionMaker("Head of Compliance") > scoreDecisionMaker("Founder"));
  assert.ok(scoreDecisionMaker("General Counsel") > scoreDecisionMaker("Chief Executive Officer"));
});

test("paid enrichment applies the same per-run cap to Apollo and Hunter", () => {
  assert.equal(shouldRunPaidEnrichment(0, 12, "example.com"), true);
  assert.equal(shouldRunPaidEnrichment(11, 12, "example.com"), true);
  assert.equal(shouldRunPaidEnrichment(12, 12, "example.com"), false);
  assert.equal(shouldRunPaidEnrichment(0, 12, null), false);
  assert.equal(shouldRunPaidEnrichment(0, 0, "example.com"), false);
});
