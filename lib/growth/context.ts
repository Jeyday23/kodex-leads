// The Brain: one context bundle reused by every Growth Engine generator
// (Job 0 - shared foundation). WS1 replaces the body of
// getBrainContextBundle() with a Supabase store read (seed as fallback); this
// file must stay free of "server-only" because scripts/ and workers/ import
// it directly under plain tsx.
//
// Every seed value below is sourced from this repository. Where the repo has
// no source for a fact (for example headquarters, pricing or customer
// counts), the value is set to "Not set" rather than a plausible-sounding
// guess - see the decisions log in
// docs/growth-engine/00-HANDOFF-AND-BUILD-PLAN.md section 8.

export type GrowthChannel = "linkedin" | "x" | "reddit" | "articles" | "email";

export type KeywordType = "product" | "problem" | "competitor";

export type SignalConfigType =
  | "keyword"
  | "competitor"
  | "influencer"
  | "own_brand"
  | "hiring"
  | "stack"
  | "regulatory"
  | "manual";

export interface CompanyIcp {
  targetVerticals: string[];
  companySizes: string[];
  geographies: string[];
  championRoles: string[];
  userRoles: string[];
  buyingRoles: string[];
}

export interface CompanyProfile {
  name: string;
  oneLineDescription: string;
  website: string;
  vertical: string;
  headquarters: string;
  marketSummary: string;
  icp: CompanyIcp;
  salesLanguageRules: string[];
}

export interface Persona {
  id: string;
  name: string;
  title: string;
  goals: string[];
  pains: string[];
  triggers: string[];
}

export interface Keyword {
  id: string;
  term: string;
  type: KeywordType;
  language: string;
}

export interface MessagePillar {
  id: string;
  title: string;
  claim: string;
  proof: string;
}

export interface Objection {
  id: string;
  objection: string;
  response: string;
}

export interface Competitor {
  id: string;
  name: string;
  domain: string;
  summary: string;
}

export interface Influencer {
  id: string;
  name: string;
  handle: string;
  platform: string;
  why: string;
}

export interface ChannelVoice {
  tone: string;
  rules: string[];
  bannedTerms: string[];
  maxLength: number;
  example: string;
}

export interface SignalConfig {
  type: SignalConfigType;
  enabled: boolean;
  targets: string[];
}

export interface BrainContextBundle {
  profile: CompanyProfile;
  personas: Persona[];
  keywords: Keyword[];
  messagePillars: MessagePillar[];
  objections: Objection[];
  competitors: Competitor[];
  influencers: Influencer[];
  channelVoices: Record<GrowthChannel, ChannelVoice>;
  signalConfigs: SignalConfig[];
}

/**
 * Every voice bans the em dash character (described in words below, never
 * emitted as the glyph itself, since renderBrainContext() must not contain
 * one either) plus a handful of AI-tell phrases repo-wide content should
 * avoid.
 */
const SHARED_BANNED_TERMS = ["—", "game-changer", "unlock", "delve", "seamless"];

// Source: app/layout.tsx metadata description, DEFAULT_SITE_URL in
// lib/seo/config.ts, and the outreach copy in lib/seo/lead-work-packages.ts
// ("Kodex helps EU teams turn compliance requirements into evidence that can
// be demonstrated to customers, auditors and regulators.").
export const seedBrainContextBundle: BrainContextBundle = {
  profile: {
    // Source: lib/media/brand.ts ("Kodex Compliance Authority Engine"),
    // lib/seo/lead-work-packages.ts sign-off ("Kodex Compliance").
    name: "Kodex Compliance",
    // Source: lib/seo/lead-work-packages.ts outreach email body.
    oneLineDescription:
      "Kodex helps EU teams turn compliance requirements into evidence that can be demonstrated to customers, auditors and regulators.",
    // Source: lib/seo/config.ts DEFAULT_SITE_URL.
    website: "https://kodex-compliance.com",
    // Source: app/layout.tsx metadata description.
    vertical: "Compliance and AI governance software for EU-regulated companies",
    // No source in this repo for a physical headquarters. Ruling in
    // docs/growth-engine/00-HANDOFF-AND-BUILD-PLAN.md section 8: unset until
    // supplied via the Brain UI.
    headquarters: "Not set",
    // Source: app/page.tsx hero module copy (Lead Signal Engine, SEO
    // Autopilot, Authority Engine, Google Discovery) and app/layout.tsx
    // description.
    marketSummary:
      "Kodex growth intelligence for lead discovery, source-backed SEO, Google indexing feedback and LLM visibility.",
    icp: {
      // Source: lib/seo/config.ts displayFramework() label map, which lists
      // the regulatory frameworks the product covers.
      targetVerticals: ["EU AI Act", "GDPR", "NIS2", "DORA", "ISO 27001", "SOC 2", "Cyber Resilience Act", "Product Liability"],
      // Source: lib/seo/types.ts LeadCaptureInput.companySize union.
      companySizes: ["1-10", "11-50", "51-200", "201-1000", "1000+"],
      // Source: lib/seo/topic-graph.ts TopicGraphNode.jurisdiction values
      // ("EU", "DACH").
      geographies: ["EU", "DACH"],
      // Source: lib/seo/lead-discovery.ts decisionMakerPriority, top-weighted
      // roles (data protection officer, compliance officer, CISO).
      championRoles: ["Data Protection Officer", "Head of Compliance", "Compliance Officer", "CISO"],
      // Source: lib/seo/lead-discovery.ts decisionMakerPriority, mid-weighted
      // roles that use the product day to day.
      userRoles: ["Privacy Lead", "General Counsel", "Risk Manager"],
      // Source: lib/seo/lead-discovery.ts decisionMakerPriority, executive
      // roles that sign off ("Geschaftsfuhrer"/"Managing Director", "CTO",
      // "Founder", "CEO").
      buyingRoles: ["Managing Director", "CTO", "Founder", "CEO"],
    },
    // Source: lib/media/brand.ts buildKodexMediaPrompt() brand direction and
    // guardrails ("premium EU compliance technology, restrained editorial
    // design, high trust"; "Avoid... fabricated official seals, invented
    // legal claims, sensational fear language, and visual claims that are
    // not supported by the source content.").
    salesLanguageRules: [
      "Premium, restrained, high-trust tone; no sensational fear language.",
      "Never fabricate legal claims, official seals, or endorsements.",
      "Every claim must trace to a source; do not state a visual or factual claim the source content does not support.",
      "State framework obligations as readiness work, not as proof the reader's company is already noncompliant.",
    ],
  },
  personas: [
    {
      // Source: lib/seo/lead-discovery.ts decisionMakerPriority top entry
      // ("data protection officer", weight 110) and DACH signal handling.
      id: "persona-dpo",
      name: "Dana, the Data Protection Officer",
      title: "Data Protection Officer",
      goals: ["Demonstrate GDPR and AI Act readiness to auditors", "Keep evidence current without manual spreadsheet work"],
      pains: ["Evidence scattered across tools and owners", "No early warning before a regulatory deadline lands"],
      triggers: ["EU AI Act obligation deadlines", "A new DPA enforcement action in the sector"],
    },
    {
      // Source: lib/seo/lead-discovery.ts decisionMakerPriority
      // ("chief information security", "ciso").
      id: "persona-ciso",
      name: "Chris, the CISO",
      title: "Chief Information Security Officer",
      goals: ["Pass SOC 2 / ISO 27001 audits with less manual evidence gathering", "Give sales a credible trust story"],
      pains: ["Competitor trust centres look more mature", "Security questionnaires repeat the same unanswered gaps"],
      triggers: ["Enterprise deal blocked on a security questionnaire", "A competitor publishes a trust centre"],
    },
  ],
  keywords: [
    // Source: lib/seo/topic-graph.ts baseTopics primaryKeyword values.
    { id: "kw-eu-ai-act-obligations", term: "EU AI Act high-risk obligations", type: "product", language: "en" },
    { id: "kw-eu-ai-act-deadline", term: "EU AI Act deadline August 2026", type: "problem", language: "en" },
    // Source: lib/authority/store.ts seedPrompts ("evidence management
    // alternatives" prompt group "competitor-comparison").
    { id: "kw-evidence-alternatives", term: "alternatives to spreadsheets for AI compliance evidence", type: "problem", language: "en" },
    // Source: lib/authority/store.ts seedCompetitors.
    { id: "kw-vanta", term: "Vanta", type: "competitor", language: "en" },
    { id: "kw-drata", term: "Drata", type: "competitor", language: "en" },
  ],
  messagePillars: [
    {
      // Source: app/page.tsx module copy for "Authority Engine".
      id: "pillar-authority",
      title: "Explainable authority tracking",
      claim: "Track prompts, citations, competitors and visibility across connected answer engines.",
      proof: "lib/authority/monitoring.ts and lib/authority/citation-parser.ts already measure AI answer-engine visibility outcomes.",
    },
    {
      // Source: app/page.tsx module copy for "SEO Autopilot".
      id: "pillar-seo-autopilot",
      title: "Source-backed content with quality gates",
      claim: "Build source-backed compliance pages, apply quality gates and keep weak or unsupported pages out of search.",
      proof: "lib/authority/editorial.ts and the autonomous-ranking quality gate reject unsupported claims before publish.",
    },
  ],
  objections: [
    {
      // Source: lib/seo/lead-discovery.ts fitReason disclaimers, which
      // repeatedly clarify that a signal is not proof of noncompliance or a
      // pending fine.
      id: "obj-not-noncompliant",
      objection: "We are not aware of anything wrong with our compliance today.",
      response:
        "This is a readiness signal, not a claim that your company is noncompliant or will be fined. The goal is to have evidence ready before a customer, auditor or regulator asks for it.",
    },
    {
      // Source: lib/authority/store.ts seedCompetitors and the
      // competitor-comparison seed prompt.
      id: "obj-already-have-tool",
      objection: "We already use a compliance platform.",
      response: "Kodex is not a replacement pitch; it is worth comparing where your current evidence gaps still show up in an AI-assisted buyer search.",
    },
  ],
  competitors: [
    // Source: lib/authority/store.ts seedCompetitors = ["Vanta", "Drata",
    // "Secureframe", "OneTrust"].
    { id: "comp-vanta", name: "Vanta", domain: "vanta.com", summary: "US-based trust and compliance automation platform tracked as a competitor in lib/authority/store.ts." },
    { id: "comp-drata", name: "Drata", domain: "drata.com", summary: "Compliance automation platform tracked as a competitor in lib/authority/store.ts." },
    { id: "comp-secureframe", name: "Secureframe", domain: "secureframe.com", summary: "Compliance automation platform tracked as a competitor in lib/authority/store.ts." },
    { id: "comp-onetrust", name: "OneTrust", domain: "onetrust.com", summary: "Privacy and governance platform tracked as a competitor in lib/authority/store.ts." },
  ],
  influencers: [
    {
      // No named influencer exists anywhere in this repo; left unset rather
      // than inventing a name or handle, per the section 8 ruling.
      id: "influencer-unset-1",
      name: "Not set",
      handle: "Not set",
      platform: "Not set",
      why: "No influencer list exists in this repo yet; populate via the Brain UI.",
    },
  ],
  channelVoices: {
    linkedin: {
      tone: "Confident, specific, practitioner-to-practitioner; no hype.",
      rules: [
        "Lead with a concrete regulatory fact or deadline, not a hook question.",
        "One idea per post; end with a genuine question or a link, never both.",
      ],
      bannedTerms: SHARED_BANNED_TERMS,
      maxLength: 1300,
      example:
        "The EU AI Act high-risk obligations window is closing. Most teams still track evidence in spreadsheets. Here is what a defensible evidence trail actually needs.",
    },
    x: {
      tone: "Terse, fact-first, no thread-bait.",
      rules: ["Fit the claim and its source in one post.", "No emoji, no hashtags."],
      bannedTerms: SHARED_BANNED_TERMS,
      maxLength: 280,
      example: "EU AI Act high-risk obligations are readiness work now, not a future problem.",
    },
    reddit: {
      tone: "Helpful peer answering a real question, never promotional.",
      rules: [
        "Answer the actual question asked before mentioning Kodex at all.",
        "Disclose you work on Kodex if you mention it by name.",
      ],
      bannedTerms: SHARED_BANNED_TERMS,
      maxLength: 2000,
      example:
        "If you are mapping EU AI Act obligations for the first time, start with which role you hold (provider, deployer, importer) since the obligations differ by role.",
    },
    articles: {
      tone: "Editorial, source-cited, precise about jurisdiction and framework.",
      rules: [
        "Every regulatory claim needs a source URL, matching the pattern in lib/seo/topic-graph.ts sourceUrls.",
        "State the jurisdiction (EU or DACH) explicitly rather than implying a global rule.",
      ],
      bannedTerms: SHARED_BANNED_TERMS,
      maxLength: 3000,
      example: "Under the EU AI Act, high-risk system providers face obligations that begin well before the August 2026 deadline.",
    },
    email: {
      tone: "Short, personal, one clear ask.",
      rules: [
        "Reference the specific signal that triggered the email, never a generic pitch.",
        "One call to action per email.",
      ],
      bannedTerms: SHARED_BANNED_TERMS,
      maxLength: 900,
      // Source: lib/seo/lead-work-packages.ts outreach email body template.
      example:
        "I came across a public signal relevant to your company. Kodex helps EU teams turn compliance requirements into evidence that can be demonstrated to customers, auditors and regulators.",
    },
  },
  // Ruling in docs/growth-engine/00-HANDOFF-AND-BUILD-PLAN.md section 8:
  // signalConfigs live only at the bundle level; channel voices carry none.
  // Source of signal types: lib/seo/lead-discovery.ts (hiring, regulatory)
  // and lib/authority/store.ts (competitor, own_brand via seedCompetitors).
  signalConfigs: [
    { type: "keyword", enabled: true, targets: ["EU AI Act high-risk obligations", "GDPR AI governance"] },
    { type: "competitor", enabled: true, targets: ["Vanta", "Drata", "Secureframe", "OneTrust"] },
    { type: "regulatory", enabled: true, targets: ["EU DPA enforcement", "EU tenders"] },
    { type: "hiring", enabled: false, targets: [] },
    { type: "stack", enabled: false, targets: [] },
    { type: "influencer", enabled: false, targets: [] },
    { type: "own_brand", enabled: true, targets: ["Kodex Compliance"] },
    { type: "manual", enabled: true, targets: [] },
  ],
};

/**
 * Returns the Brain context bundle. WS1 will replace this body with a
 * Supabase store read that falls back to seedBrainContextBundle when
 * unconfigured (the same pattern as lib/authority/store.ts); keep this
 * function free of "server-only" when that change lands.
 */
export async function getBrainContextBundle(): Promise<BrainContextBundle> {
  return seedBrainContextBundle;
}

export function getChannelVoice(bundle: BrainContextBundle, channel: GrowthChannel): ChannelVoice {
  return bundle.channelVoices[channel];
}

export type BrainContextSection =
  | "profile"
  | "personas"
  | "keywords"
  | "messagePillars"
  | "objections"
  | "competitors"
  | "influencers"
  | "voice";

const ALL_SECTIONS: BrainContextSection[] = [
  "profile",
  "personas",
  "keywords",
  "messagePillars",
  "objections",
  "competitors",
  "influencers",
  "voice",
];

export interface RenderBrainContextOptions {
  channel?: GrowthChannel;
  sections?: BrainContextSection[];
}

/**
 * The word "em dash" is spelled out here deliberately: every voice bans the
 * character itself, and this block is prepended to every generator's system
 * prompt, so the rendered text must never contain the glyph it is warning
 * against.
 */
function describeBannedTerms(bannedTerms: string[]): string {
  return bannedTerms
    .map((term) => (term === "—" ? "the em dash character" : term))
    .join(", ");
}

/**
 * Renders a compact plain-text block describing the Brain for prepending to
 * a generator's system prompt. Contains no em dash anywhere in its output,
 * since every channel voice bans that character.
 */
export function renderBrainContext(bundle: BrainContextBundle, options?: RenderBrainContextOptions): string {
  const sections = options?.sections ?? ALL_SECTIONS;
  const wantsSection = (section: BrainContextSection) => sections.includes(section);
  const lines: string[] = [];

  if (wantsSection("profile")) {
    const { profile } = bundle;
    lines.push(`Company: ${profile.name} - ${profile.oneLineDescription}`);
    lines.push(`Website: ${profile.website}. Vertical: ${profile.vertical}. Headquarters: ${profile.headquarters}.`);
    lines.push(`Market: ${profile.marketSummary}`);
    lines.push(
      `ICP: verticals ${profile.icp.targetVerticals.join(", ")}; sizes ${profile.icp.companySizes.join(", ")}; geographies ${profile.icp.geographies.join(", ")}.`,
    );
    lines.push(`Champion roles: ${profile.icp.championRoles.join(", ")}. Buying roles: ${profile.icp.buyingRoles.join(", ")}.`);
    lines.push(`Sales language rules: ${profile.salesLanguageRules.join(" ")}`);
  }

  if (wantsSection("personas") && bundle.personas.length > 0) {
    lines.push("Personas:");
    for (const persona of bundle.personas) {
      lines.push(`- ${persona.name} (${persona.title}): goals - ${persona.goals.join("; ")}. pains - ${persona.pains.join("; ")}.`);
    }
  }

  if (wantsSection("keywords") && bundle.keywords.length > 0) {
    lines.push(`Keywords: ${bundle.keywords.map((keyword) => `${keyword.term} [${keyword.type}]`).join(", ")}`);
  }

  if (wantsSection("messagePillars") && bundle.messagePillars.length > 0) {
    lines.push("Message pillars:");
    for (const pillar of bundle.messagePillars) {
      lines.push(`- ${pillar.title}: ${pillar.claim} Proof: ${pillar.proof}`);
    }
  }

  if (wantsSection("objections") && bundle.objections.length > 0) {
    lines.push("Objections:");
    for (const objection of bundle.objections) {
      lines.push(`- "${objection.objection}" -> ${objection.response}`);
    }
  }

  if (wantsSection("competitors") && bundle.competitors.length > 0) {
    lines.push(`Competitors: ${bundle.competitors.map((competitor) => `${competitor.name} (${competitor.domain})`).join(", ")}`);
  }

  if (wantsSection("influencers") && bundle.influencers.length > 0) {
    lines.push(`Influencers: ${bundle.influencers.map((influencer) => influencer.name).join(", ")}`);
  }

  if (wantsSection("voice") && options?.channel) {
    const voice = getChannelVoice(bundle, options.channel);
    lines.push(`Voice for ${options.channel}: tone - ${voice.tone}. Max length ${voice.maxLength} characters.`);
    lines.push(`Rules: ${voice.rules.join(" ")}`);
    lines.push(`Banned: ${describeBannedTerms(voice.bannedTerms)}.`);
    lines.push(`Example: ${voice.example}`);
  }

  return lines.join("\n");
}
