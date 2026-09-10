// Proposes a Brain bundle from a company website: fetches the homepage plus
// up to a bounded number of same-origin internal pages, strips markup to
// plain text, and asks generateJson() for a structured proposal against a
// zod schema. Never writes to the store - the caller (the seed/apply route)
// is the only place a proposal is persisted.
//
// Not "server-only": reachable from scripts/ and workers/ via lib/growth/**.

import { z } from "zod";
import { generateJson } from "@/lib/growth/llm";
import { renderBrainContext, type BrainContextBundle } from "@/lib/growth/context";

const MAX_INTERNAL_PAGES = 6;
const FETCH_TIMEOUT_MS = 8000;
const MAX_TEXT_CHARS_PER_PAGE = 6000;

const proposedBundleSchema = z.object({
  profile: z.object({
    name: z.string().min(1).optional(),
    oneLineDescription: z.string().min(1).optional(),
    vertical: z.string().min(1).optional(),
    marketSummary: z.string().min(1).optional(),
  }).optional(),
  personas: z
    .array(
      z.object({
        name: z.string().min(1),
        title: z.string().min(1),
        goals: z.array(z.string()).default([]),
        pains: z.array(z.string()).default([]),
        triggers: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  keywords: z
    .array(
      z.object({
        term: z.string().min(1),
        type: z.enum(["product", "problem", "competitor"]),
        language: z.string().min(2).default("en"),
      }),
    )
    .default([]),
  messagePillars: z
    .array(
      z.object({
        title: z.string().min(1),
        claim: z.string().min(1),
        proof: z.string().min(1),
      }),
    )
    .default([]),
  objections: z
    .array(
      z.object({
        objection: z.string().min(1),
        response: z.string().min(1),
      }),
    )
    .default([]),
  competitors: z
    .array(
      z.object({
        name: z.string().min(1),
        domain: z.string().min(1).optional(),
        summary: z.string().min(1).optional(),
      }),
    )
    .default([]),
});

export type ProposedBrainBundle = z.infer<typeof proposedBundleSchema>;

export type SeedFromWebsiteStatus = "proposed" | "skipped" | "failed";

export interface SeedFromWebsiteResult {
  status: SeedFromWebsiteStatus;
  proposal?: ProposedBrainBundle;
  pagesFetched: string[];
  detail?: string;
}

export interface SeedFromWebsiteInput {
  url: string;
}

/**
 * Strips HTML tags and collapses whitespace. Intentionally simple: this is
 * fed to an LLM as reading material, not rendered, so imperfect stripping of
 * script/style contents beyond a full tag scrub is acceptable.
 */
function htmlToText(html: string): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const withoutTags = withoutScripts.replace(/<[^>]+>/g, " ");
  return decodeEntities(withoutTags).replace(/\s+/g, " ").trim();
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractSameOriginLinks(html: string, origin: string): string[] {
  const found = new Set<string>();
  const hrefRe = /href=["']([^"']+)["']/gi;
  for (const match of html.matchAll(hrefRe)) {
    const href = match[1];
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    try {
      const resolved = new URL(href, origin);
      if (resolved.origin !== origin) continue;
      resolved.hash = "";
      found.add(resolved.toString());
    } catch {
      continue;
    }
  }
  return [...found];
}

async function fetchPageText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!response.ok) return null;
    const html = await response.text();
    return htmlToText(html).slice(0, MAX_TEXT_CHARS_PER_PAGE);
  } catch {
    return null;
  }
}

/**
 * Fetches the homepage plus up to MAX_INTERNAL_PAGES same-origin internal
 * pages linked from it, then asks generateJson() to propose Brain content
 * from the combined text. Returns a proposal only; never writes to the
 * store. Returns status "skipped" (naming the reason) when no LLM provider
 * is configured, without making any network request in that case.
 */
export async function seedBrainFromWebsite(
  input: SeedFromWebsiteInput,
  currentBundle: BrainContextBundle,
): Promise<SeedFromWebsiteResult> {
  let origin: URL;
  try {
    origin = new URL(input.url);
  } catch {
    return { status: "failed", pagesFetched: [], detail: `"${input.url}" is not a valid URL.` };
  }

  const homepageHtmlResponse = await fetch(origin.toString(), { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }).catch(() => null);
  if (!homepageHtmlResponse || !homepageHtmlResponse.ok) {
    return { status: "failed", pagesFetched: [], detail: `Could not fetch ${origin.toString()}.` };
  }
  const homepageHtml = await homepageHtmlResponse.text();
  const homepageText = htmlToText(homepageHtml).slice(0, MAX_TEXT_CHARS_PER_PAGE);

  const internalLinks = extractSameOriginLinks(homepageHtml, origin.origin)
    .filter((link) => link !== origin.toString())
    .slice(0, MAX_INTERNAL_PAGES);

  const pagesFetched = [origin.toString()];
  const pageTexts = [homepageText];
  for (const link of internalLinks) {
    const text = await fetchPageText(link);
    if (text) {
      pagesFetched.push(link);
      pageTexts.push(text);
    }
  }

  const combinedText = pageTexts.join("\n\n---\n\n");

  const system = [
    "You are the Growth Brain seeding assistant for a compliance software company.",
    "Read the provided website text and propose Brain content strictly as JSON matching the given shape.",
    "Never invent facts the text does not support; omit a field or array entry rather than guessing.",
    "Follow this company's existing sales language rules.",
    renderBrainContext(currentBundle, { sections: ["profile"] }),
  ].join("\n");

  const prompt = [
    "Website text (homepage plus internal pages, separated by ---):",
    combinedText,
    "",
    "Propose: profile (name, oneLineDescription, vertical, marketSummary), personas, keywords (typed product|problem|competitor), messagePillars, objections, competitors.",
    "Return only a single JSON object with keys profile, personas, keywords, messagePillars, objections, competitors.",
  ].join("\n");

  const result = await generateJson({ system, prompt, maxTokens: 1800 }, proposedBundleSchema);

  if (result.status === "generated") {
    return { status: "proposed", proposal: result.value, pagesFetched };
  }

  return { status: result.status, pagesFetched, detail: result.detail };
}
