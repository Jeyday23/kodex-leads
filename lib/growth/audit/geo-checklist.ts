// The ten deterministic GEO ("generative engine optimization" / AI-citation
// readiness) signals for the Growth Engine site-audit module (WS2). Every
// signal is computed from data handed in by the caller - the page HTML and a
// SiteFilesBundle from site-files.ts - so this module makes no network calls
// itself and is fully testable on inline HTML fixtures.

import type { SiteFilesBundle } from "./site-files";

export type GeoCheckStatus = "pass" | "fix";

export interface GeoCheckResult {
  id: string;
  label: string;
  status: GeoCheckStatus;
  detail: string;
  fix: string;
}

export const GEO_CONTENT_DEPTH_MIN_WORDS = 600;
export const GEO_FLESCH_MIN_SCORE = 50;
export const GEO_META_DESCRIPTION_MIN_LENGTH = 50;
export const GEO_META_DESCRIPTION_MAX_LENGTH = 160;

function stripTagBlock(html: string, tag: string): string {
  return html.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi"), " ");
}

/**
 * Strips script, style, and nav content and all remaining tags, collapsing
 * whitespace, to approximate the page's readable main-content text. Not a
 * full HTML parser - deliberately simple and dependency-free.
 */
export function extractVisibleText(html: string): string {
  let text = html;
  for (const tag of ["script", "style", "nav", "noscript", "template"]) {
    text = stripTagBlock(text, tag);
  }
  text = text.replace(/<!--[\s\S]*?-->/g, " ");
  text = text.replace(/<[^>]+>/g, " ");
  text = text.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&[a-z#0-9]+;/gi, " ");
  return text.replace(/\s+/g, " ").trim();
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Syllable-counting heuristic (no dictionary lookup, so it is an
 * approximation used consistently for both the numerator and the standard
 * Flesch formula): counts vowel-group clusters per word, drops a silent
 * trailing "e" when the word has more than one cluster, and floors every
 * word at one syllable.
 */
export function countSyllables(word: string): number {
  const lower = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!lower) return 0;
  const clusters = lower.match(/[aeiouy]+/g) ?? [];
  let count = clusters.length;
  if (lower.endsWith("e") && count > 1 && !lower.endsWith("le")) count -= 1;
  return Math.max(count, 1);
}

function splitSentences(text: string): string[] {
  return text
    .split(/[.!?]+(?:\s+|$)/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function splitWords(text: string): string[] {
  return (text.match(/[A-Za-z']+/g) ?? []).filter(Boolean);
}

/**
 * Standard Flesch reading ease formula:
 *   206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words)
 * Returns null when there is not enough text (no words or no sentences) to
 * compute a meaningful score.
 */
export function fleschReadingEase(text: string): number | null {
  const words = splitWords(text);
  const sentences = splitSentences(text);
  if (words.length === 0 || sentences.length === 0) return null;

  const syllables = words.reduce((total, word) => total + countSyllables(word), 0);
  const wordsPerSentence = words.length / sentences.length;
  const syllablesPerWord = syllables / words.length;

  return 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
}

function hasJsonLd(html: string): boolean {
  const blocks = html.match(/<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  for (const block of blocks) {
    const inner = /<script[^>]*>([\s\S]*?)<\/script>/i.exec(block)?.[1] ?? "";
    try {
      JSON.parse(inner.trim());
      return true;
    } catch {
      continue;
    }
  }
  return false;
}

function metaDescription(html: string): string | null {
  const match = /<meta\s+[^>]*name\s*=\s*["']description["'][^>]*>/i.exec(html);
  if (!match) return null;
  const contentMatch = /content\s*=\s*["']([^"']*)["']/i.exec(match[0]);
  return contentMatch ? contentMatch[1] : null;
}

function headingCounts(html: string): { h1: number; h2: number } {
  const h1 = (html.match(/<h1\b[^>]*>/gi) ?? []).length;
  const h2 = (html.match(/<h2\b[^>]*>/gi) ?? []).length;
  return { h1, h2 };
}

function hasCanonical(html: string): boolean {
  return /<link\s+[^>]*rel\s*=\s*["']canonical["'][^>]*>/i.test(html);
}

function htmlLang(html: string): string | null {
  const match = /<html\b[^>]*\blang\s*=\s*["']([^"']+)["'][^>]*>/i.exec(html);
  return match ? match[1] : null;
}

/**
 * Evaluates all ten deterministic GEO signals against one page's HTML and the
 * site's robots.txt/llms.txt/sitemap.xml presence. Order matches the brief.
 */
export function evaluateGeoChecklist(html: string, siteFiles: SiteFilesBundle): GeoCheckResult[] {
  const results: GeoCheckResult[] = [];

  const jsonLdPresent = hasJsonLd(html);
  results.push({
    id: "schema_jsonld",
    label: "Schema.org JSON-LD",
    status: jsonLdPresent ? "pass" : "fix",
    detail: jsonLdPresent
      ? "A valid JSON-LD structured data block is present."
      : "No valid <script type=\"application/ld+json\"> block was found.",
    fix: "Add a JSON-LD block describing the page (Organization, Article, or FAQPage as appropriate) so AI answer engines can parse entities directly.",
  });

  const description = metaDescription(html);
  const descriptionOk = Boolean(description && description.trim().length >= GEO_META_DESCRIPTION_MIN_LENGTH);
  results.push({
    id: "meta_description",
    label: "Meta description",
    status: descriptionOk ? "pass" : "fix",
    detail: description
      ? `Meta description is ${description.trim().length} characters.`
      : "No <meta name=\"description\"> tag was found.",
    fix: `Write a unique meta description of ${GEO_META_DESCRIPTION_MIN_LENGTH}-${GEO_META_DESCRIPTION_MAX_LENGTH} characters that summarizes the page for search and AI snippets.`,
  });

  const headings = headingCounts(html);
  const headingOk = headings.h1 === 1 && headings.h2 >= 1;
  results.push({
    id: "heading_structure",
    label: "Heading structure",
    status: headingOk ? "pass" : "fix",
    detail: `Found ${headings.h1} <h1> and ${headings.h2} <h2> element(s).`,
    fix: "Use exactly one <h1> for the page title and at least one <h2> to break up sections so both search and AI crawlers can outline the content.",
  });

  const visibleText = extractVisibleText(html);
  const wordCount = countWords(visibleText);
  const depthOk = wordCount >= GEO_CONTENT_DEPTH_MIN_WORDS;
  results.push({
    id: "content_depth",
    label: "Content depth",
    status: depthOk ? "pass" : "fix",
    detail: `Main content is approximately ${wordCount} words (after removing script, style, and nav content).`,
    fix: `Expand the main content to at least ${GEO_CONTENT_DEPTH_MIN_WORDS} words so answer engines have enough substance to cite.`,
  });

  const canonicalOk = hasCanonical(html);
  results.push({
    id: "canonical",
    label: "Canonical tag",
    status: canonicalOk ? "pass" : "fix",
    detail: canonicalOk ? "A <link rel=\"canonical\"> tag is present." : "No <link rel=\"canonical\"> tag was found.",
    fix: "Add a self-referencing canonical link so search and AI crawlers attribute the content to a single authoritative URL.",
  });

  results.push({
    id: "robots_txt",
    label: "robots.txt",
    status: siteFiles.robotsTxt.present ? "pass" : "fix",
    detail: siteFiles.robotsTxt.present
      ? "robots.txt is reachable."
      : `robots.txt could not be fetched${siteFiles.robotsTxt.detail ? `: ${siteFiles.robotsTxt.detail}` : "."}`,
    fix: "Publish a robots.txt at the site root that allows reputable crawlers (including AI answer-engine bots) and links to the sitemap.",
  });

  results.push({
    id: "llms_txt",
    label: "llms.txt",
    status: siteFiles.llmsTxt.present ? "pass" : "fix",
    detail: siteFiles.llmsTxt.present
      ? "llms.txt is reachable."
      : `llms.txt could not be fetched${siteFiles.llmsTxt.detail ? `: ${siteFiles.llmsTxt.detail}` : "."}`,
    fix: "Publish an llms.txt at the site root summarizing the site and linking key pages, following the emerging llms.txt convention for AI crawlers.",
  });

  results.push({
    id: "sitemap_xml",
    label: "sitemap.xml",
    status: siteFiles.sitemapXml.present ? "pass" : "fix",
    detail: siteFiles.sitemapXml.present
      ? "sitemap.xml is reachable."
      : `sitemap.xml could not be fetched${siteFiles.sitemapXml.detail ? `: ${siteFiles.sitemapXml.detail}` : "."}`,
    fix: "Publish an XML sitemap listing indexable pages and reference it from robots.txt.",
  });

  const lang = htmlLang(html);
  const langOk = Boolean(lang && lang.trim().length > 0);
  results.push({
    id: "html_lang",
    label: "HTML language attribute",
    status: langOk ? "pass" : "fix",
    detail: langOk ? `<html lang="${lang}"> is set.` : "No lang attribute was found on the <html> element.",
    fix: "Add a lang attribute to the <html> element (for example lang=\"en\") so crawlers and assistive technology know the page's language.",
  });

  const flesch = fleschReadingEase(visibleText);
  const fleschOk = flesch !== null && flesch >= GEO_FLESCH_MIN_SCORE;
  results.push({
    id: "flesch_reading_ease",
    label: "Flesch reading ease",
    status: fleschOk ? "pass" : "fix",
    detail: flesch === null ? "Not enough text to compute a reading-ease score." : `Flesch reading ease score is ${flesch.toFixed(1)}.`,
    fix: `Simplify sentence structure and word choice until the Flesch reading ease score is at least ${GEO_FLESCH_MIN_SCORE} (plain, direct language reads best to both humans and AI summarizers).`,
  });

  return results;
}
