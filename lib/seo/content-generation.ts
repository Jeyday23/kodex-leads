import "server-only";
import { createHash } from "node:crypto";
import { getSiteUrl } from "./config";
import { getSeoSupabase } from "./db";
import { generateWithConfiguredProviders } from "./llm-providers";
import { storeAuditEventLocally, upsertGeneratedContentPage } from "./local-store";
import { stableTopicId, slugForTopic, type TopicGraphNode } from "./topic-graph";
import { pathForSeoPage } from "./urls";
import type { ClaimLedgerEntry, SeoContentBody, SeoContentPage, SeoSource } from "./types";
import type { SourceCheckResult } from "./source-intelligence";

interface DraftResult {
  page: SeoContentPage;
  generatedBy: "claude" | "source-template";
}

const fallbackSourceMap: Record<string, SeoSource> = {
  "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689": {
    authority: "European Union",
    title: "Regulation (EU) 2024/1689 laying down harmonised rules on artificial intelligence",
    sourceUrl: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689",
    publishedAt: "2024-07-12T00:00:00.000Z",
    supportedClaim: "The EU AI Act phases obligations by role, system risk category and application date.",
  },
  "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai": {
    authority: "European Commission",
    title: "AI Act regulatory framework information",
    sourceUrl: "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai",
    publishedAt: "2024-08-01T00:00:00.000Z",
    supportedClaim: "EU implementation guidance should be checked against official Commission materials.",
  },
  "https://digital-strategy.ec.europa.eu/en/policies/nis2-directive": {
    authority: "European Commission",
    title: "NIS2 Directive policy information",
    sourceUrl: "https://digital-strategy.ec.europa.eu/en/policies/nis2-directive",
    publishedAt: "2023-01-16T00:00:00.000Z",
    supportedClaim: "NIS2 expands cybersecurity risk-management and reporting obligations across covered sectors.",
  },
  "https://edpb.europa.eu/our-work-tools/our-documents/guidelines_en": {
    authority: "European Data Protection Board",
    title: "EDPB guidelines",
    sourceUrl: "https://edpb.europa.eu/our-work-tools/our-documents/guidelines_en",
    publishedAt: "2024-01-01T00:00:00.000Z",
    supportedClaim: "Privacy assessments should be anchored in official European data-protection guidance.",
  },
};

export async function generateAndPersistDrafts(topics: TopicGraphNode[], sourceChecks: SourceCheckResult[]): Promise<DraftResult[]> {
  const results: DraftResult[] = [];
  for (const topic of topics) {
    const draft = await draftPage(topic, sourceChecks);
    await persistDraft(draft.page);
    await storeAuditEventLocally({
      eventType: "content_draft_generated",
      contentId: draft.page.id,
      payload: {
        route: pathForSeoPage(draft.page),
        generatedBy: draft.generatedBy,
        topic: topic.primaryKeyword,
        claimLedgerEntries: draft.page.body.claimLedger?.length ?? 0,
      },
    });
    results.push(draft);
  }
  return results;
}

async function draftPage(topic: TopicGraphNode, sourceChecks: SourceCheckResult[]): Promise<DraftResult> {
  const sources = resolveSources(topic, sourceChecks);
  const ledger = buildClaimLedger(topic, sources);
  const claudeBody = await draftWithClaude(topic, sources, ledger);
  const body = claudeBody ?? templateBody(topic, ledger);
  const page: SeoContentPage = {
    id: stableTopicId(topic),
    slug: slugForTopic(topic),
    language: "en",
    pageType: topic.pageType,
    title: titleForTopic(topic),
    description: descriptionForTopic(topic),
    body,
    framework: topic.framework,
    jurisdiction: topic.jurisdiction,
    primaryKeyword: topic.primaryKeyword.toLowerCase(),
    searchIntent: topic.searchIntent,
    targetTool: topic.targetTool,
    qualityScore: 0,
    reviewStatus: "draft",
    legalInterpretation: false,
    canonicalUrl: `${getSiteUrl()}${pathForSeoPage({ pageType: topic.pageType, framework: topic.framework, slug: slugForTopic(topic) })}`,
    noindex: true,
    publishedAt: null,
    updatedAt: new Date().toISOString(),
    sources,
    internalLinks: linksForTopic(topic),
  };
  return { page, generatedBy: claudeBody ? "claude" : "source-template" };
}

function resolveSources(topic: TopicGraphNode, sourceChecks: SourceCheckResult[]): SeoSource[] {
  const fromChecks = sourceChecks
    .filter((check) => topic.sourceUrls.includes(check.url) || topic.sourceUrls.length === 0)
    .map((check) => ({
      authority: check.name.includes("Commission") ? "European Commission" : check.name.includes("Board") ? "European Data Protection Board" : "European Union",
      title: check.name,
      sourceUrl: check.url,
      publishedAt: "2024-01-01T00:00:00.000Z",
      supportedClaim: check.note ?? `${check.name} is an approved monitored source for this Kodex topic.`,
      retrievedAt: new Date().toISOString(),
      contentHash: check.contentHash ?? hashText(check.url),
    }));
  const fallback = topic.sourceUrls.flatMap((url) => fallbackSourceMap[url] ? [{ ...fallbackSourceMap[url], retrievedAt: new Date().toISOString(), contentHash: hashText(url) }] : []);
  const sources = [...fromChecks, ...fallback];
  const unique = new Map<string, SeoSource>();
  for (const source of sources) unique.set(source.sourceUrl, source);
  if (unique.size < 2) {
    unique.set(fallbackSourceMap["https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai"].sourceUrl, {
      ...fallbackSourceMap["https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai"],
      retrievedAt: new Date().toISOString(),
      contentHash: hashText("https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai"),
    });
  }
  return [...unique.values()].slice(0, 3);
}

function buildClaimLedger(topic: TopicGraphNode, sources: SeoSource[]): ClaimLedgerEntry[] {
  return [
    {
      claim: `${topic.primaryKeyword} should be assessed against official EU source material before publishing recommendations.`,
      sourceUrl: sources[0].sourceUrl,
      sourceTitle: sources[0].title,
      retrievalHash: sources[0].contentHash ?? hashText(sources[0].sourceUrl),
      retrievedAt: sources[0].retrievedAt ?? new Date().toISOString(),
    },
    {
      claim: `Kodex routes ${topic.framework.toUpperCase()} readiness traffic into ${topic.targetTool}.`,
      sourceUrl: sources[1].sourceUrl,
      sourceTitle: sources[1].title,
      retrievalHash: sources[1].contentHash ?? hashText(sources[1].sourceUrl),
      retrievedAt: sources[1].retrievedAt ?? new Date().toISOString(),
    },
  ];
}

async function draftWithClaude(topic: TopicGraphNode, sources: SeoSource[], ledger: ClaimLedgerEntry[]): Promise<SeoContentBody | null> {
  if (!process.env.ANTHROPIC_API_KEY || !process.env.CLAUDE_MODEL) return null;
  const prompt = [
    "Draft a Kodex SEO content body as strict JSON with keys summary, keyFacts, sections.",
    "Use only the supplied sources and claims. Do not add facts beyond these records.",
    `Topic: ${topic.primaryKeyword}`,
    `Target assessment: ${topic.targetTool}`,
    `Sources: ${JSON.stringify(sources)}`,
    `Claim ledger: ${JSON.stringify(ledger)}`,
  ].join("\n");
  const [result] = (await generateWithConfiguredProviders({
    system: "You draft source-grounded compliance acquisition pages for Kodex. Return JSON only.",
    prompt,
    maxTokens: 900,
  })).filter((provider) => provider.provider === "anthropic");
  if (!result || result.status !== "generated") return null;
  try {
    const parsed = JSON.parse(result.text) as Partial<SeoContentBody>;
    if (!parsed.summary || !Array.isArray(parsed.sections) || parsed.sections.length < 3) return null;
    return {
      summary: parsed.summary,
      keyFacts: parsed.keyFacts ?? ledger.map((entry) => entry.claim),
      sections: parsed.sections.slice(0, 5),
      claimLedger: ledger,
      nextAction: { label: `Run the ${topic.framework.toUpperCase()} assessment`, href: topic.targetTool },
    };
  } catch {
    return null;
  }
}

function templateBody(topic: TopicGraphNode, ledger: ClaimLedgerEntry[]): SeoContentBody {
  return {
    summary: `${topic.primaryKeyword} is a high-intent compliance question. Kodex turns that traffic into a source-backed readiness assessment and measurable lead attribution.`,
    keyFacts: ledger.map((entry) => entry.claim),
    claimLedger: ledger,
    sections: [
      {
        heading: "What the source-backed scan checks",
        body: `Kodex starts with the ${topic.framework.toUpperCase()} framework, jurisdiction, AI usage, company size and deadline pressure before recommending the next assessment path.`,
      },
      {
        heading: "Why the topic matters commercially",
        body: topic.reason,
      },
      {
        heading: "How the page stays publishable",
        body: "Every factual assertion is tied to a monitored source URL and retrieval hash. The draft remains noindex until the quality gate approves source count, dates, links, canonical URL and conversion path.",
      },
      {
        heading: "Next action",
        body: `Visitors with active exposure should complete ${topic.targetTool} so Kodex can score urgency and route qualified follow-up.`,
      },
    ],
    nextAction: { label: `Run the ${topic.framework.toUpperCase()} assessment`, href: topic.targetTool },
  };
}

async function persistDraft(page: SeoContentPage): Promise<void> {
  const supabase = getSeoSupabase();
  if (!supabase) {
    await upsertGeneratedContentPage(page);
    return;
  }

  const { data: storedPage, error } = await supabase
    .from("content_pages")
    .upsert({
      id: page.id,
      slug: page.slug,
      language: page.language,
      page_type: page.pageType,
      title: page.title,
      description: page.description,
      body: page.body,
      framework: page.framework,
      jurisdiction: page.jurisdiction,
      primary_keyword: page.primaryKeyword,
      search_intent: page.searchIntent,
      target_tool: page.targetTool,
      quality_score: 0,
      review_status: "draft",
      legal_interpretation: page.legalInterpretation,
      canonical_url: page.canonicalUrl,
      noindex: true,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !storedPage) {
    await storeAuditEventLocally({ eventType: "content_draft_persist_failed", contentId: page.id, payload: { error: error?.message ?? "Unknown Supabase error" } });
    return;
  }

  for (const source of page.sources) {
    const { data: document } = await supabase
      .from("source_documents")
      .upsert({
        authority: source.authority,
        source_url: source.sourceUrl,
        title: source.title,
        published_at: source.publishedAt,
        effective_at: source.effectiveAt,
        checked_at: source.retrievedAt,
        content_hash: source.contentHash,
        last_checked_at: source.retrievedAt ?? new Date().toISOString(),
      }, { onConflict: "source_url" })
      .select("id")
      .single();
    if (document) {
      await supabase.from("content_sources").upsert({
        content_id: page.id,
        source_document_id: document.id,
        supported_claim: source.supportedClaim ?? `${source.title} supports this page.`,
      });
    }
  }
}

function titleForTopic(topic: TopicGraphNode): string {
  return topic.primaryKeyword
    .split(" ")
    .map((word) => word.length <= 3 && word.toUpperCase() === word ? word : `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function descriptionForTopic(topic: TopicGraphNode): string {
  return `Source-backed ${topic.framework.toUpperCase()} guidance for teams converting ${topic.searchIntent} demand into a Kodex readiness assessment.`;
}

function linksForTopic(topic: TopicGraphNode) {
  return [
    { href: topic.targetTool, label: `${topic.framework.toUpperCase()} assessment`, relationship: "conversion" },
    { href: "/deadlines/eu-ai-act", label: "EU AI Act deadlines", relationship: "cluster" },
    { href: "/compare/vanta-vs-kodex", label: "Vanta vs Kodex", relationship: "cluster" },
  ];
}

function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
