import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  checkDomainDeliverability,
  classifyDomain,
  extractDomain,
  type DomainCheck,
} from "../lib/seo/domain-deliverability";

/**
 * All four payloads below were returned by the live Disify API on 2026-09-05.
 * They are not invented. If Disify changes its schema, these are what fail.
 */
const LIVE = {
  business: {
    format: true, domain: "kodex-compliance.com", disposable: false, dns: true,
    confidence: 20, signals: ["high_entropy"], mx_info: ["smtpin.rzone.de"],
    role: false, free: false,
  } as DomainCheck,
  disposable: {
    format: true, domain: "mailinator.com", disposable: true, dns: true,
    confidence: 100, signals: ["blacklist_exact", "keyword_match", "mx_blacklist_exact"],
    role: false, free: false,
  } as DomainCheck,
  noMx: {
    format: true, domain: "zzz-not-a-real-domain-xyz-9981.com", disposable: false, dns: false,
    confidence: 50, signals: ["high_entropy", "no_mx_records"], role: false, free: false,
  } as DomainCheck,
  free: {
    format: true, domain: "gmail.com", disposable: false, dns: true, whitelist: true,
    confidence: 0, mx_info: ["gmail-smtp-in.l.google.com"], role: false, free: true,
  } as DomainCheck,
};

test("a real company domain passes with no caution", () => {
  const { verdict, caution } = classifyDomain(LIVE.business);
  assert.equal(verdict, "deliverable");
  assert.equal(caution, null);
});

test("a domain with no MX records is undeliverable", () => {
  const { verdict, caution } = classifyDomain(LIVE.noMx);
  assert.equal(verdict, "undeliverable");
  assert.match(caution ?? "", /no MX records/);
});

test("a disposable domain is undeliverable", () => {
  const { verdict, caution } = classifyDomain(LIVE.disposable);
  assert.equal(verdict, "undeliverable");
  assert.match(caution ?? "", /disposable/);
});

test("a free consumer provider is flagged, not rejected", () => {
  const { verdict, caution } = classifyDomain(LIVE.free);
  assert.equal(verdict, "not_a_business");
  assert.match(caution ?? "", /free consumer mail provider/);
});

test("no MX outranks every other signal", () => {
  // A domain can be both disposable and dead. The dead answer is the useful one.
  const both = { ...LIVE.disposable, dns: false };
  assert.equal(classifyDomain(both).verdict, "undeliverable");
  assert.match(classifyDomain(both).caution ?? "", /no MX records/);
});

test("disify confidence is never mistaken for a lead score", () => {
  // Higher confidence means MORE likely disposable. gmail is 0, mailinator 100.
  // Reading it the other way round would promote the worst domains.
  assert.equal(LIVE.free.confidence, 0);
  assert.equal(LIVE.disposable.confidence, 100);
  assert.equal(classifyDomain(LIVE.free).verdict, "not_a_business");
  assert.equal(classifyDomain(LIVE.disposable).verdict, "undeliverable");
});

test("domains are read out of URLs, emails and bare hostnames", () => {
  assert.equal(extractDomain("https://www.kodex-compliance.com/assess/gdpr?a=1"), "kodex-compliance.com");
  assert.equal(extractDomain("jeremiah@kodex-compliance.com"), "kodex-compliance.com");
  assert.equal(extractDomain("KODEX-COMPLIANCE.COM"), "kodex-compliance.com");
  assert.equal(extractDomain("http://example.co.uk:8080/x"), "example.co.uk");
  assert.equal(extractDomain("ted.europa.eu"), "ted.europa.eu");
});

test("junk input yields no domain rather than a bad query", () => {
  for (const junk of ["", "   ", null, undefined, "localhost", "not a domain", "192.168.1.1"]) {
    assert.equal(extractDomain(junk as string), null, JSON.stringify(junk));
  }
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

test("a live-shaped response is mapped end to end, MX hosts included", async () => {
  const result = await checkDomainDeliverability("https://kodex-compliance.com", {
    fetchImpl: (async () => jsonResponse(LIVE.business)) as unknown as typeof fetch,
  });
  assert.equal(result.domain, "kodex-compliance.com");
  assert.equal(result.verdict, "deliverable");
  assert.deepEqual(result.mxHosts, ["smtpin.rzone.de"]);
  assert.equal(result.error, undefined);
});

test("a checker outage never blocks a lead", async () => {
  // A screening service being down is not a reason to withhold a lead from a
  // founder who approves every send by hand.
  for (const failing of [
    (async () => { throw new Error("ECONNRESET"); }),
    (async () => jsonResponse({ detail: "nope" }, 500)),
    (async () => jsonResponse({ unexpected: "shape" })),
  ]) {
    const result = await checkDomainDeliverability("example.com", { fetchImpl: failing as unknown as typeof fetch });
    assert.equal(result.verdict, "unknown");
    assert.equal(result.caution, null, "an outage must not invent a caution");
    assert.ok(result.error, "but it must say why");
  }
});

test("no network call is made for input with no domain in it", async () => {
  let called = false;
  const result = await checkDomainDeliverability("not a domain", {
    fetchImpl: (async () => { called = true; return jsonResponse({}); }) as unknown as typeof fetch,
  });
  assert.equal(called, false);
  assert.equal(result.verdict, "unknown");
});

test("no credential is read in this module", () => {
  const source = readFileSync(join(process.cwd(), "lib/seo/domain-deliverability.ts"), "utf8");
  assert.doesNotMatch(source, /process\.env/);
});
