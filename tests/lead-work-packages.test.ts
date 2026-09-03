import test from "node:test";
import assert from "node:assert/strict";
import { buildLeadWorkPackage, scoreLeadQualification } from "../lib/seo/lead-work-packages";
import type { DiscoveredLead } from "../lib/seo/local-store";

const lead: DiscoveredLead = {
  id: "lead-1",
  createdAt: "2026-08-29T20:00:00.000Z",
  companyName: "Example GmbH",
  website: "https://example.com",
  segment: "Recent regulatory enforcement",
  fitReason: "Evidence-backed GDPR enforcement signal.",
  suggestedSearchIntent: "gdpr remediation",
  suggestedLandingPage: "/assess/gdpr",
  confidence: 88,
  source: "edpb_enforcement",
  sourceUrl: "https://example.com/enforcement",
  retrievedAt: "2026-08-29T20:00:00.000Z",
  contactEmail: "dpo@example.com",
  enrichmentProvider: "apollo+contact",
  triggerCategory: "enforcement_fine",
  regulatoryFramework: "GDPR",
  fineAmount: "€250,000",
  decisionMakerName: "Alex Privacy",
  decisionMakerTitle: "Data Protection Officer",
  decisionMakerSource: "Apollo People API Search",
  outreachAngle: "Review remediation evidence and repeat-issue prevention controls.",
};

test("verified enforcement lead qualifies strongly", () => {
  const qualification = scoreLeadQualification(lead, true);
  assert.equal(qualification.score, 100);
  assert.ok(qualification.reasons.includes("Source evidence re-verified"));
  assert.ok(qualification.reasons.includes("Direct enforcement/fine trigger"));
});

test("work package is approval-only and keeps factual caveats", () => {
  const qualification = scoreLeadQualification(lead, true);
  const item = buildLeadWorkPackage(lead, "Public source re-read; company identity matched.", qualification.score, qualification.reasons);

  assert.equal(item.decision, "pending_approval");
  assert.equal(item.evidenceVerified, true);
  assert.match(item.outreachDraft.subject, /Example GmbH/);
  assert.match(item.outreachDraft.body, /verified public enforcement source/);
  assert.ok(item.researchBrief.cautions.some((value) => value.includes("Human approval")));
  assert.equal(item.decisionMaker.email, "dpo@example.com");
});
