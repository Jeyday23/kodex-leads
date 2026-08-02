#!/usr/bin/env node

const site = (process.argv[2] || process.env.NEXT_PUBLIC_SITE_URL || "https://kodex-leads.onrender.com").replace(/\/+$/, "");
const cronSecret = process.env.CRON_SECRET;

const expectedSitemapPaths = [
  "/",
  "/assess/eu-ai-act",
  "/assess/gdpr",
  "/assess/nis2",
  "/learn/eu-ai-act/high-risk-obligations",
  "/deadlines/eu-ai-act",
  "/compare/vanta-vs-kodex",
  "/llms.txt",
  "/api/seo/ai-sitemap",
];

const expectedLlmsText = [
  "Canonical Compliance Pages",
  "EU AI Act Assessment",
  "GDPR Assessment",
  "NIS2 Assessment",
];

async function fetchText(path, init) {
  const response = await fetch(`${site}${path}`, init);
  const text = await response.text();
  return { response, text };
}

function assertOk(name, response) {
  if (!response.ok) {
    throw new Error(`${name} returned HTTP ${response.status}`);
  }
}

function assertIncludes(name, text, values) {
  const missing = values.filter((value) => !text.includes(value));
  if (missing.length > 0) {
    throw new Error(`${name} is missing: ${missing.join(", ")}`);
  }
}

async function main() {
  const checks = [];

  const robots = await fetchText("/robots.txt");
  assertOk("robots.txt", robots.response);
  assertIncludes("robots.txt", robots.text, ["Sitemap:", "/sitemap.xml"]);
  checks.push("robots.txt exposes sitemap");

  const sitemap = await fetchText("/sitemap.xml");
  assertOk("sitemap.xml", sitemap.response);
  assertIncludes("sitemap.xml", sitemap.text, expectedSitemapPaths.map((path) => `${site}${path}`));
  checks.push(`sitemap.xml exposes ${expectedSitemapPaths.length} required paths`);

  const llms = await fetchText("/llms.txt");
  assertOk("llms.txt", llms.response);
  assertIncludes("llms.txt", llms.text, expectedLlmsText);
  checks.push("llms.txt exposes LLM discovery content");

  const aiSitemap = await fetchText("/api/seo/ai-sitemap");
  assertOk("AI sitemap", aiSitemap.response);
  const aiPayload = JSON.parse(aiSitemap.text);
  if (!Array.isArray(aiPayload.pages) || aiPayload.pages.length < 4) {
    throw new Error("AI sitemap returned fewer than 4 indexed compliance pages");
  }
  checks.push(`AI sitemap exposes ${aiPayload.pages.length} indexed pages`);

  const cron = await fetchText("/api/seo/cron", cronSecret ? { headers: { authorization: `Bearer ${cronSecret}` } } : undefined);
  if (cronSecret) {
    assertOk("SEO cron", cron.response);
    checks.push("SEO cron authenticated successfully");
  } else if (cron.response.status === 401 || cron.response.status === 503) {
    checks.push("SEO cron is protected");
  } else {
    throw new Error(`SEO cron protection returned unexpected HTTP ${cron.response.status}`);
  }

  console.log(`SEO smoke test passed for ${site}`);
  for (const check of checks) console.log(`- ${check}`);
}

main().catch((error) => {
  console.error(`SEO smoke test failed for ${site}`);
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
