import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  evaluateGeoChecklist,
  fleschReadingEase,
  countWords,
  extractVisibleText,
} from "../lib/growth/audit/geo-checklist";
import { countRenderBlockingScripts, countHeadStylesheets, parseRenderBlocking } from "../lib/growth/audit/technical";
import { mapPsiResponse, CWV_THRESHOLDS } from "../lib/growth/audit/pagespeed";
import type { SiteFilesBundle } from "../lib/growth/audit/site-files";

const ALL_SITE_FILES_PRESENT: SiteFilesBundle = {
  robotsTxt: { present: true, status: 200, body: "User-agent: *\nAllow: /" },
  llmsTxt: { present: true, status: 200, body: "# Kodex Compliance" },
  sitemapXml: { present: true, status: 200, body: "<urlset></urlset>" },
};

const NO_SITE_FILES_PRESENT: SiteFilesBundle = {
  robotsTxt: { present: false, status: 404, body: null, detail: "HTTP 404" },
  llmsTxt: { present: false, status: null, body: null, detail: "fetch failed" },
  sitemapXml: { present: false, status: 404, body: null, detail: "HTTP 404" },
};

const SIMPLE_SENTENCE = "The cat sat on the mat and the dog ran to the big red barn. ";
const LONG_SIMPLE_PARAGRAPH = SIMPLE_SENTENCE.repeat(50); // well over 600 words, monosyllabic and plain

function passingHtmlFixture(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta name="description" content="Kodex Compliance helps regulated software teams meet the EU AI Act, GDPR, and other frameworks." />
  <link rel="canonical" href="https://kodex-compliance.com/" />
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Kodex Compliance"}</script>
</head>
<body>
  <nav><a href="/">Home</a><a href="/pricing">Pricing</a></nav>
  <main>
    <h1>Kodex Compliance</h1>
    <h2>Why teams choose Kodex</h2>
    <p>${LONG_SIMPLE_PARAGRAPH}</p>
  </main>
</body>
</html>`;
}

function failingHtmlFixture(): string {
  return `<!doctype html>
<html>
<head>
</head>
<body>
  <h2>Some section</h2>
  <h2>Another section</h2>
  <p>Too short to count as real content.</p>
</body>
</html>`;
}

test("evaluateGeoChecklist: passing fixture scores pass on all ten signals", () => {
  const results = evaluateGeoChecklist(passingHtmlFixture(), ALL_SITE_FILES_PRESENT);
  assert.equal(results.length, 10);
  const failing = results.filter((check) => check.status !== "pass");
  assert.deepEqual(failing, [], `expected every check to pass, got failures: ${JSON.stringify(failing, null, 2)}`);
});

test("evaluateGeoChecklist: failing fixture scores fix on most signals", () => {
  const results = evaluateGeoChecklist(failingHtmlFixture(), NO_SITE_FILES_PRESENT);
  assert.equal(results.length, 10);
  const failing = results.filter((check) => check.status === "fix");
  // schema, meta description, heading structure (no h1), content depth, canonical,
  // robots, llms, sitemap, html lang should all fail; only Flesch might vary.
  assert.ok(failing.length >= 8, `expected at least 8 fixes, got ${failing.length}`);
  for (const check of failing) {
    assert.ok(check.fix.length > 0, `check ${check.id} should carry a non-empty fix hint`);
    assert.ok(check.detail.length > 0, `check ${check.id} should carry a non-empty detail`);
  }
});

test("evaluateGeoChecklist: every result has a stable id and label", () => {
  const results = evaluateGeoChecklist(passingHtmlFixture(), ALL_SITE_FILES_PRESENT);
  const ids = results.map((check) => check.id);
  assert.deepEqual(ids, [
    "schema_jsonld",
    "meta_description",
    "heading_structure",
    "content_depth",
    "canonical",
    "robots_txt",
    "llms_txt",
    "sitemap_xml",
    "html_lang",
    "flesch_reading_ease",
  ]);
});

test("extractVisibleText strips script, style, and nav content", () => {
  const html = `<html><head><style>.a{color:red}</style></head><body>
    <nav>Nav link</nav>
    <script>var x = 1;</script>
    <main>Real content here</main>
  </body></html>`;
  const text = extractVisibleText(html);
  assert.ok(!text.includes("color:red"));
  assert.ok(!text.includes("var x"));
  assert.ok(!text.includes("Nav link"));
  assert.ok(text.includes("Real content here"));
});

test("countWords counts whitespace-separated words", () => {
  assert.equal(countWords("one two three"), 3);
  assert.equal(countWords("   "), 0);
  assert.equal(countWords(""), 0);
});

test("fleschReadingEase: a simple monosyllabic sentence scores as easy to read", () => {
  const score = fleschReadingEase("The cat sat on the mat. The dog ran to the barn.");
  assert.ok(score !== null);
  // Short, monosyllabic sentences should land in the "very easy" range.
  assert.ok(score! > 80 && score! <= 130, `expected an easy-to-read score, got ${score}`);
});

test("fleschReadingEase: returns null when there is no text", () => {
  assert.equal(fleschReadingEase(""), null);
  assert.equal(fleschReadingEase("   "), null);
});

test("countRenderBlockingScripts: counts only src scripts without async/defer/module", () => {
  const html = `
    <script src="/a.js"></script>
    <script src="/b.js" async></script>
    <script src="/c.js" defer></script>
    <script src="/d.js" type="module"></script>
    <script>inline();</script>
    <script src="/e.js"></script>
  `;
  assert.equal(countRenderBlockingScripts(html), 2);
});

test("countHeadStylesheets: counts stylesheet links only inside head", () => {
  const html = `
    <head>
      <link rel="stylesheet" href="/a.css" />
      <link rel="preload" href="/b.css" as="style" />
      <link rel="stylesheet" href="/c.css" />
    </head>
    <body>
      <link rel="stylesheet" href="/should-not-count.css" />
    </body>
  `;
  assert.equal(countHeadStylesheets(html), 2);
});

test("parseRenderBlocking: combines both counters", () => {
  const html = `<head><link rel="stylesheet" href="/a.css" /></head><body><script src="/a.js"></script></body>`;
  const result = parseRenderBlocking(html);
  assert.equal(result.blockingScriptCount, 1);
  assert.equal(result.headStylesheetCount, 1);
});

test("mapPsiResponse: maps category scores and CWV metrics from a recorded-shape fixture", () => {
  const fixture = {
    lighthouseResult: {
      categories: {
        performance: { score: 0.93 },
        accessibility: { score: 0.88 },
        "best-practices": { score: 1 },
        seo: { score: 0.95 },
      },
      audits: {
        "largest-contentful-paint": { numericValue: 1800, displayValue: "1.8 s" },
        "first-contentful-paint": { numericValue: 900, displayValue: "0.9 s" },
        "total-blocking-time": { numericValue: 350, displayValue: "350 ms" },
        "cumulative-layout-shift": { numericValue: 0.05, displayValue: "0.05" },
      },
    },
  };

  const result = mapPsiResponse(fixture, "mobile", "https://kodex-compliance.com/");
  assert.equal(result.status, "generated");
  assert.equal(result.strategy, "mobile");
  assert.equal(result.categories.performance, 93);
  assert.equal(result.categories.accessibility, 88);
  assert.equal(result.categories.bestPractices, 100);
  assert.equal(result.categories.seo, 95);

  const lcp = result.metrics.find((metric) => metric.id === "lcp");
  const tbt = result.metrics.find((metric) => metric.id === "tbt");
  const cls = result.metrics.find((metric) => metric.id === "cls");

  assert.equal(lcp?.value, 1800);
  assert.equal(lcp?.pass, true); // below CWV_THRESHOLDS.lcpMs
  assert.equal(tbt?.value, 350);
  assert.equal(tbt?.pass, false); // above CWV_THRESHOLDS.tbtMs
  assert.equal(cls?.value, 0.05);
  assert.equal(cls?.pass, true);
  assert.equal(lcp?.threshold, CWV_THRESHOLDS.lcpMs);
});

test("mapPsiResponse: missing audits map to null values without throwing", () => {
  const result = mapPsiResponse({}, "desktop", "https://kodex-compliance.com/");
  assert.equal(result.status, "generated");
  assert.equal(result.categories.performance, null);
  for (const metric of result.metrics) {
    assert.equal(metric.value, null);
    assert.equal(metric.pass, null);
  }
});

test("only the run route grants allowCron - latest and history require an admin session", () => {
  const root = process.cwd();
  const routes: Record<string, string> = {
    run: readFileSync(join(root, "app/api/growth/audit/run/route.ts"), "utf8"),
    latest: readFileSync(join(root, "app/api/growth/audit/latest/route.ts"), "utf8"),
    history: readFileSync(join(root, "app/api/growth/audit/history/route.ts"), "utf8"),
  };

  assert.match(routes.run, /allowCron/, "run/route.ts should grant allowCron for scheduled runs");
  assert.doesNotMatch(routes.latest, /allowCron/, "latest/route.ts is a data read and must require an admin session");
  assert.doesNotMatch(routes.history, /allowCron/, "history/route.ts is a data read and must require an admin session");
});
