import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  discoverEuTenderLeads,
  isOpenTender,
  matchFramework,
  tenderConfidence,
  tenderToLead,
  TENDER_DIVISIONS,
  type TenderNotice,
} from "../lib/seo/eu-tenders";

/**
 * Shape taken verbatim from the live API on 2026-09-05
 * (GET https://jaydemks.github.io/bidledger/api/c/DEU.json, first row).
 * If Bidledger changes its schema these tests are what should fail.
 */
const LIVE_SHAPE: TenderNotice = {
  id: "535484-2026",
  title: "Germany – Construction work – Westfalenpark,WERK in Dortmund, Erd- und Rohbauarbeiten",
  buyer: "Vergabe und Beschaffungszentrum Dortmund",
  country: "DEU",
  country_name: "Germany",
  cpv_main_label: "Construction work",
  contract_nature: "works",
  published: "2026-08-03",
  deadline: "2099-09-05T20:00:00+02:00",
  url: "https://jaydemks.github.io/bidledger/n/535484-2026.html",
  ted_url: "https://ted.europa.eu/en/notice/-/detail/535484-2026",
};

const notice = (over: Partial<TenderNotice>): TenderNotice => ({ ...LIVE_SHAPE, ...over });

test("only the three CPV divisions where compliance is procured are queried", () => {
  assert.deepEqual(TENDER_DIVISIONS.map((d) => d.division), ["48", "72", "79"]);
});

test("frameworks are matched in the languages the notices are written in", () => {
  const cases: Array<[string, string]> = [
    ["Datenschutzbeauftragter gesucht", "GDPR"],
    ["Mise en conformité RGPD", "GDPR"],
    ["Implementation of the EU AI Act", "EU AI Act"],
    ["Umsetzung der KI-Verordnung", "EU AI Act"],
    ["NIS2 readiness assessment", "NIS2"],
    ["DORA operational resilience programme", "DORA"],
    ["ISO 27001 certification support", "ISO 27001"],
    ["Hinweisgeberschutzsystem", "Whistleblower Directive"],
    ["Wzmocnienie cyberbezpieczeństwa infrastruktury", "Information security"],
    ["External compliance audit services", "Compliance audit"],
  ];
  for (const [title, expected] of cases) {
    assert.equal(matchFramework({ title, buyer: "" }), expected, title);
  }
});

test("construction work is not a compliance lead", () => {
  assert.equal(matchFramework({ title: LIVE_SHAPE.title, buyer: LIVE_SHAPE.buyer }), null);
});

test("the buyer name is searched too, not just the title", () => {
  assert.equal(matchFramework({ title: "Framework agreement", buyer: "Bundesbeauftragte für den Datenschutz" }), "GDPR");
});

test("a named framework outranks a bare mention of audit", () => {
  assert.ok(tenderConfidence("EU AI Act") > tenderConfidence("Information security"));
  assert.ok(tenderConfidence("Information security") > tenderConfidence("Compliance audit"));
  // Never as confident as a confirmed enforcement action, which uses 96.
  for (const framework of ["GDPR", "EU AI Act", "NIS2", "Compliance audit"]) {
    assert.ok(tenderConfidence(framework) < 96, framework);
  }
});

test("a closed tender is not a lead", () => {
  const now = new Date("2026-09-05T12:00:00Z");
  assert.equal(isOpenTender({ deadline: "2026-09-04T23:59:00+02:00" }, now), false);
  assert.equal(isOpenTender({ deadline: "2026-09-06T09:00:00+02:00" }, now), true);
  assert.equal(isOpenTender({ deadline: "" }, now), false);
  assert.equal(isOpenTender({ deadline: "not a date" }, now), false);
});

test("the lead names the buyer, cites TED, and claims no wrongdoing", () => {
  const lead = tenderToLead(notice({ title: "Germany – Datenschutz-Folgenabschätzung", buyer: "Stadt Köln" }), "GDPR");
  assert.equal(lead.companyName, "Stadt Köln");
  assert.equal(lead.sourceUrl, LIVE_SHAPE.ted_url);
  assert.equal(lead.source, "eu_ted_tenders");
  assert.equal(lead.triggerCategory, "regulatory_exposure");
  assert.equal(lead.regulatoryFramework, "GDPR");
  assert.equal(lead.fineAmount, null);
  // A tender says what a buyer wants, never that they did something wrong.
  assert.match(lead.fitReason, /not\s+evidence of any deficiency/i);
  assert.match(lead.outreachAngle ?? "", /535484-2026/);
});

test("triggerCategory uses a value the stored enum already has", () => {
  // Same rule as the rest of the engine: reuse the schema, never invent a value.
  const allowed = ["enforcement_fine", "regulatory_exposure", "new_company", "compliance_hiring", "funding", "ai_product"];
  assert.ok(allowed.includes(tenderToLead(notice({}), "GDPR").triggerCategory as string));
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

test("only compliance notices survive a full run, and they are deduped", async () => {
  const hit = notice({ id: "1-2026", title: "Ireland – GDPR data protection officer services", ted_url: "https://ted.europa.eu/en/notice/-/detail/1-2026" });
  const miss = notice({ id: "2-2026", title: "Spain – Road resurfacing", ted_url: "https://ted.europa.eu/en/notice/-/detail/2-2026" });
  const { leads, errors } = await discoverEuTenderLeads({
    // The same notice legitimately appears under more than one CPV division.
    fetchImpl: (async () => jsonResponse([hit, miss])) as unknown as typeof fetch,
  });
  assert.deepEqual(errors, []);
  assert.equal(leads.length, 1);
  assert.equal(leads[0].regulatoryFramework, "GDPR");
});

test("the cap keeps the highest-confidence leads, not the first ones seen", async () => {
  const weak = Array.from({ length: 5 }, (_, i) =>
    notice({ id: `w${i}`, title: "Generic compliance audit services", ted_url: `https://ted.europa.eu/en/notice/-/detail/w${i}` }));
  const strong = notice({ id: "s1", title: "EU AI Act conformity assessment", ted_url: "https://ted.europa.eu/en/notice/-/detail/s1" });
  const { leads } = await discoverEuTenderLeads({
    limit: 2,
    fetchImpl: (async () => jsonResponse([...weak, strong])) as unknown as typeof fetch,
  });
  assert.equal(leads.length, 2);
  assert.equal(leads[0].regulatoryFramework, "EU AI Act");
});

test("an HTTP error is reported per division and never throws", async () => {
  const { leads, errors } = await discoverEuTenderLeads({
    fetchImpl: (async () => jsonResponse({ error: "gone" }, 503)) as unknown as typeof fetch,
  });
  assert.deepEqual(leads, []);
  assert.equal(errors.length, TENDER_DIVISIONS.length);
  for (const error of errors) assert.match(error, /HTTP 503/);
});

test("a changed API shape is reported loudly instead of returning zero leads quietly", async () => {
  const wrongShape = await discoverEuTenderLeads({
    fetchImpl: (async () => jsonResponse({ notices: [] })) as unknown as typeof fetch,
  });
  for (const error of wrongShape.errors) assert.match(error, /shape may have changed/);

  const wrongFields = await discoverEuTenderLeads({
    fetchImpl: (async () => jsonResponse([{ tender_id: "x", name: "y" }])) as unknown as typeof fetch,
  });
  for (const error of wrongFields.errors) assert.match(error, /none had id\/title\/buyer/);
});

test("a network failure is caught, not propagated to the cron", async () => {
  const { leads, errors } = await discoverEuTenderLeads({
    fetchImpl: (async () => { throw new Error("ETIMEDOUT"); }) as unknown as typeof fetch,
  });
  assert.deepEqual(leads, []);
  assert.equal(errors.length, TENDER_DIVISIONS.length);
  for (const error of errors) assert.match(error, /ETIMEDOUT/);
});

test("no credential is read in this module", () => {
  // Constraint from the operator: server-side secrets stay server-side, and a
  // keyless source must never grow a NEXT_PUBLIC_ fallback.
  const source = readFileSync(join(process.cwd(), "lib/seo/eu-tenders.ts"), "utf8");
  assert.doesNotMatch(source, /process\.env/);
});
