// Pure quality gate for channel content drafts (WS4). No I/O, no LLM calls,
// no Supabase - every check here operates only on the draft text and the
// channel's ChannelVoice, so it can run identically in draft.ts, in the
// admin UI readiness checklist, and in tests.

import type { ChannelVoice } from "@/lib/growth/context";

export interface QualityGateResult {
  pass: boolean;
  reasons: string[];
}

const EM_DASH = "—";

// Framework names the Brain's ICP and keyword seed data track (see
// lib/growth/context.ts seedBrainContextBundle.profile.icp.targetVerticals),
// plus the obligation verbs a regulatory claim typically uses. A draft is
// treated as making a regulatory claim when it names at least one framework
// AND uses at least one obligation verb - naming a framework alone (e.g. "we
// support GDPR") is not itself a claim requiring a disclaimer.
const FRAMEWORK_NAMES = [
  "eu ai act",
  "ai act",
  "gdpr",
  "nis2",
  "dora",
  "iso 27001",
  "soc 2",
  "cyber resilience act",
  "product liability",
];

const OBLIGATION_VERBS = [
  "must",
  "required to",
  "requires",
  "requirement",
  "obligat",
  "shall",
  "mandat",
  "need to comply",
  "have to comply",
  "penalt",
  "fine",
];

const DISCLAIMER_PHRASES = [
  "not legal advice",
  "not intended as legal advice",
  "does not constitute legal advice",
  "consult your own legal counsel",
  "consult a qualified lawyer",
];

const HASHTAG_RE = /(^|\s)#[a-z0-9_]+/i;
// Common emoji ranges; deliberately broad rather than an exhaustive Unicode
// emoji property check, since a false positive here only blocks a draft that
// a human reviewer can still approve manually.
const EMOJI_RE =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/u;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsBannedTerm(text: string, term: string): boolean {
  // Word-boundary matching only makes sense for alphanumeric terms; a
  // symbol-only banned term (the em dash) is matched as a plain substring.
  if (/^[a-z0-9\s-]+$/i.test(term)) {
    const pattern = new RegExp(`\\b${escapeRegExp(term)}\\b`, "i");
    return pattern.test(text);
  }
  return text.includes(term);
}

function forbidsPattern(rules: string[], keyword: string): boolean {
  return rules.some((rule) => rule.toLowerCase().includes(keyword));
}

function mentionsRegulatoryClaim(text: string): boolean {
  const lower = text.toLowerCase();
  const namesFramework = FRAMEWORK_NAMES.some((name) => lower.includes(name));
  if (!namesFramework) return false;
  return OBLIGATION_VERBS.some((verb) => lower.includes(verb));
}

function hasDisclaimer(text: string): boolean {
  const lower = text.toLowerCase();
  return DISCLAIMER_PHRASES.some((phrase) => lower.includes(phrase));
}

/**
 * Evaluates a channel draft's body text against its voice. Deterministic and
 * side-effect free: given the same text and voice it always returns the same
 * result.
 */
export function evaluateChannelDraft(text: string, voice: ChannelVoice): QualityGateResult {
  const reasons: string[] = [];

  if (text.trim().length === 0) {
    reasons.push("Draft body is empty.");
  }

  if (text.length > voice.maxLength) {
    reasons.push(`Draft is ${text.length} characters, over the ${voice.maxLength} character limit for this channel.`);
  }

  if (text.includes(EM_DASH)) {
    reasons.push("Draft contains the em dash character, which every channel voice bans.");
  }

  for (const term of voice.bannedTerms) {
    if (term === EM_DASH) continue; // already checked above with a clearer message
    if (containsBannedTerm(text, term)) {
      reasons.push(`Draft uses the banned term "${term}".`);
    }
  }

  if (forbidsPattern(voice.rules, "hashtag") && HASHTAG_RE.test(text)) {
    reasons.push("Draft contains a hashtag, which this channel's voice rules forbid.");
  }

  if (forbidsPattern(voice.rules, "emoji") && EMOJI_RE.test(text)) {
    reasons.push("Draft contains an emoji, which this channel's voice rules forbid.");
  }

  if (mentionsRegulatoryClaim(text) && !hasDisclaimer(text)) {
    reasons.push(
      "Draft states a regulatory obligation without a not-legal-advice disclaimer.",
    );
  }

  return { pass: reasons.length === 0, reasons };
}
