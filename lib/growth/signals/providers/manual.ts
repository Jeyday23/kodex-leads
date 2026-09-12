// WS3 manual signal classifier. A human pastes a LinkedIn post URL or raw
// text (a job posting, a forum thread, a comment) and this classifies it
// against the Brain's own keywords, competitors, influencers and brand name.
// Pure and deterministic: no network, no LLM call.

import type { BrainContextBundle, SignalConfigType } from "@/lib/growth/context";
import type { SignalEventDraft } from "../types";

export interface ManualClassificationInput {
  text: string;
  url?: string;
  companyName?: string;
  companyDomain?: string;
}

function normalize(value: string): string {
  return value.toLowerCase();
}

function findMatches(normalizedText: string, candidates: string[]): string[] {
  return candidates.filter((candidate) => candidate.trim().length > 0 && normalizedText.includes(normalize(candidate)));
}

/** Deterministic short hash so a dedupe key does not need a database round trip. */
function shortHash(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

/**
 * Classifies pasted text/URL against the bundle. A single paste can match
 * more than one category (for example a post that both mentions a competitor
 * by name and uses a target keyword) - each match becomes its own event so
 * evidence stays specific to the category it supports.
 */
export function classifyManualSignal(input: ManualClassificationInput, bundle: BrainContextBundle): SignalEventDraft[] {
  const normalizedText = normalize(input.text);
  const detectedAt = new Date().toISOString();
  const events: SignalEventDraft[] = [];

  function push(type: SignalConfigType, matched: string[], label: string) {
    if (matched.length === 0) return;
    events.push({
      type,
      source: "manual",
      companyName: input.companyName,
      companyDomain: input.companyDomain,
      evidence: { matched, label, excerpt: input.text.slice(0, 400) },
      url: input.url,
      strength: Math.min(1, 0.4 + matched.length * 0.15),
      dedupeKey: `manual:${type}:${shortHash((input.url ?? "") + matched.join(",") + input.text)}`,
      detectedAt,
    });
  }

  const keywordMatches = findMatches(
    normalizedText,
    bundle.keywords.map((keyword) => keyword.term),
  );
  push("keyword", keywordMatches, "keyword mention");

  const competitorMatches = findMatches(
    normalizedText,
    bundle.competitors.map((competitor) => competitor.name),
  );
  push("competitor", competitorMatches, "competitor mention");

  const influencerMatches = findMatches(
    normalizedText,
    bundle.influencers.flatMap((influencer) => [influencer.name, influencer.handle]).filter((value) => value !== "Not set"),
  );
  push("influencer", influencerMatches, "influencer mention");

  const brandMatches = findMatches(normalizedText, [bundle.profile.name]);
  push("own_brand", brandMatches, "own brand mention");

  return events;
}
