import type { BrandExtraction, CitationExtraction, CompetitorExtraction } from "./types";

const urlPattern = /https?:\/\/[^\s)"'<>]+/gi;

export function extractCitations(answer: string, providerCitations: Array<{ title?: string; url: string }> = []): CitationExtraction[] {
  const directUrls: Array<{ title?: string; url: string }> = Array.from(answer.matchAll(urlPattern)).map((match) => ({ url: cleanUrl(match[0]) }));
  const merged = [...providerCitations, ...directUrls];
  const seen = new Set<string>();

  return merged.flatMap((citation, index) => {
    const url = cleanUrl(citation.url);
    const domain = domainForUrl(url);
    if (!domain || seen.has(url)) return [];
    seen.add(url);
    return [{
      title: citation.title,
      url,
      domain,
      position: index + 1,
      citesKodex: isKodexUrl(url),
    }];
  });
}

export function extractBrandMention(answer: string, brandName = "Kodex"): BrandExtraction {
  const mentioned = new RegExp(`\\b${escapeRegExp(brandName)}\\b`, "i").test(answer);
  const positive = /\b(recommend|best|strong|useful|leader|trusted|shortlist)\b/i.test(answer);
  const negative = /\b(avoid|weak|not recommended|risk|limited)\b/i.test(answer);

  return {
    mentioned,
    sentiment: negative ? "negative" : positive ? "positive" : "neutral",
    recommendationStrength: mentioned ? positive ? 0.86 : negative ? 0.22 : 0.55 : 0,
    evidence: mentioned ? sentenceWith(answer, brandName) : undefined,
  };
}

export function extractCompetitorMentions(answer: string, competitors: string[]): CompetitorExtraction[] {
  return competitors.map((name) => {
    const pattern = new RegExp(`\\b${escapeRegExp(name)}\\b`, "ig");
    const matches = answer.match(pattern) ?? [];
    return {
      name,
      mentioned: matches.length > 0,
      citationCount: matches.length,
    };
  });
}

export function extractionConfidence(answer: string, citations: CitationExtraction[], brand: BrandExtraction): number {
  const answerSignal = Math.min(answer.length / 1200, 1) * 0.4;
  const citationSignal = Math.min(citations.length / 4, 1) * 0.35;
  const brandSignal = brand.mentioned ? 0.25 : 0.1;
  return Number((answerSignal + citationSignal + brandSignal).toFixed(2));
}

function cleanUrl(url: string): string {
  return url.replace(/[),.;\]]+$/g, "");
}

function domainForUrl(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function isKodexUrl(url: string): boolean {
  const domain = domainForUrl(url);
  return Boolean(domain?.includes("kodex"));
}

function sentenceWith(answer: string, term: string): string | undefined {
  return answer.split(/(?<=[.!?])\s+/).find((sentence) => sentence.toLowerCase().includes(term.toLowerCase()))?.slice(0, 280);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
