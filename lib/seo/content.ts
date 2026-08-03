import type { SeoContentBody, SeoContentPage, SeoInternalLink, SeoPageType, SeoSource } from "./types";
import { getSeoSupabase } from "./db";
import { listGeneratedContentPages } from "./local-store";

const now = "2026-07-31T00:00:00.000Z";

const seedSources: SeoSource[] = [
  {
    authority: "European Union",
    title: "Regulation (EU) 2024/1689 laying down harmonised rules on artificial intelligence",
    sourceUrl: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj",
    publishedAt: "2024-07-12T00:00:00.000Z",
    supportedClaim: "EU AI Act obligations phase in by role, system risk category and application date.",
  },
  {
    authority: "European Commission",
    title: "AI Act implementation information",
    sourceUrl: "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai",
    publishedAt: "2024-08-01T00:00:00.000Z",
    supportedClaim: "Implementation timing and guidance should be checked against official EU sources.",
  },
];

const baseBody: SeoContentBody = {
  summary:
    "Kodex maintains a source-backed authority system that helps search engines and LLM retrieval systems understand the brand, its compliance focus and its cited evidence.",
  keyFacts: [
    "Public content should be crawlable, internally linked and grounded in official sources.",
    "LLM visibility checks measure whether answer engines mention, cite or miss Kodex.",
    "Unsupported legal, deadline, competitor or product claims are blocked before publication.",
  ],
  sections: [
    {
      heading: "What the system checks",
      body:
        "The authority loop checks indexed pages, source freshness, LLM answer visibility, citation presence, search-performance gaps and technical SEO issues.",
    },
    {
      heading: "How Kodex avoids hallucinations",
      body:
        "Every content candidate is scored against source coverage, claim support, duplicate intent, internal links, canonical routing and review policy before it can be published.",
    },
    {
      heading: "What happens after a run",
      body:
        "The system creates opportunities, revision tasks and draft assets, then keeps risky work queued until the quality gates allow it.",
    },
  ],
  nextAction: { label: "Open the private authority command center", href: "/admin/authority/command" },
};

const seedPages: SeoContentPage[] = [
  {
    id: "seed-kodex-ai-answer-visibility",
    slug: "ai-answer-visibility",
    language: "en",
    pageType: "learn",
    title: "Kodex AI Answer Visibility",
    description: "A source-backed page explaining how Kodex measures recognition, mentions and citations across LLM answer systems.",
    body: baseBody,
    framework: "kodex",
    jurisdiction: "Global",
    primaryKeyword: "kodex ai answer visibility",
    searchIntent: "answer-engine-recognition",
    targetTool: "/admin/authority/command",
    qualityScore: 92,
    reviewStatus: "published",
    legalInterpretation: false,
    canonicalUrl: null,
    noindex: false,
    publishedAt: now,
    updatedAt: now,
    sources: seedSources,
    internalLinks: [
      { href: "/admin/authority/command", label: "Authority command center", relationship: "operator" },
      { href: "/admin/seo", label: "SEO queue", relationship: "operator" },
      { href: "/api/seo/ai-sitemap", label: "Crawler inventory JSON", relationship: "machine-readable" },
    ],
  },
  {
    id: "seed-source-backed-compliance-trust",
    slug: "source-backed-compliance-trust",
    language: "en",
    pageType: "learn",
    title: "Source-Backed Compliance Trust",
    description: "How Kodex uses official regulatory sources to make compliance content easier for search engines and LLMs to trust.",
    body: {
      ...baseBody,
      nextAction: { label: "Review source-backed SEO pages", href: "/admin/seo" },
    },
    framework: "eu-ai-act",
    jurisdiction: "EU",
    primaryKeyword: "source backed compliance trust",
    searchIntent: "trust-and-evidence",
    targetTool: "/admin/seo",
    qualityScore: 90,
    reviewStatus: "published",
    legalInterpretation: false,
    canonicalUrl: null,
    noindex: false,
    publishedAt: now,
    updatedAt: now,
    sources: seedSources,
    internalLinks: [
      { href: "/learn/kodex/ai-answer-visibility", label: "Kodex AI answer visibility", relationship: "cluster" },
      { href: "/admin/authority/knowledge", label: "Knowledge sources", relationship: "operator" },
      { href: "/llms.txt", label: "LLM retrieval file", relationship: "machine-readable" },
    ],
  },
  {
    id: "seed-authority-monitoring-workflow",
    slug: "authority-monitoring-workflow",
    language: "en",
    pageType: "learn",
    title: "Kodex Authority Monitoring Workflow",
    description: "The private workflow for finding visibility gaps, drafting improvements and tracking citations across competitors.",
    body: {
      ...baseBody,
      nextAction: { label: "Open authority monitoring", href: "/admin/authority/observatory" },
    },
    framework: "kodex",
    jurisdiction: "Global",
    primaryKeyword: "kodex authority monitoring workflow",
    searchIntent: "visibility-operations",
    targetTool: "/admin/authority/observatory",
    qualityScore: 88,
    reviewStatus: "published",
    legalInterpretation: false,
    canonicalUrl: null,
    noindex: false,
    publishedAt: now,
    updatedAt: now,
    sources: seedSources,
    internalLinks: [
      { href: "/admin/authority/opportunities", label: "Opportunity discovery", relationship: "operator" },
      { href: "/admin/authority/revisions", label: "Revision planner", relationship: "operator" },
      { href: "/admin/authority/competitors", label: "Competitor tracking", relationship: "operator" },
    ],
  },
  {
    id: "seed-llm-crawl-inventory",
    slug: "llm-crawl-inventory",
    language: "en",
    pageType: "learn",
    title: "LLM Crawl Inventory for Kodex",
    description: "The canonical machine-readable inventory used by Kodex to expose source-backed pages to AI crawlers and retrieval systems.",
    body: baseBody,
    framework: "kodex",
    jurisdiction: "Global",
    primaryKeyword: "llm crawl inventory kodex",
    searchIntent: "machine-readable-indexing",
    targetTool: "/api/seo/ai-sitemap",
    qualityScore: 84,
    reviewStatus: "published",
    legalInterpretation: false,
    canonicalUrl: null,
    noindex: false,
    publishedAt: now,
    updatedAt: now,
    sources: seedSources,
    internalLinks: [
      { href: "/api/seo/ai-sitemap", label: "AI sitemap JSON", relationship: "machine-readable" },
      { href: "/sitemap.xml", label: "Search sitemap", relationship: "machine-readable" },
      { href: "/robots.txt", label: "Robots policy", relationship: "machine-readable" },
    ],
  },
];

function parseBody(body: unknown): SeoContentBody {
  if (!body || typeof body !== "object") return baseBody;
  const candidate = body as Partial<SeoContentBody>;
  return {
    summary: candidate.summary ?? baseBody.summary,
    sections: Array.isArray(candidate.sections) && candidate.sections.length > 0 ? candidate.sections : baseBody.sections,
    keyFacts: candidate.keyFacts,
    claimLedger: candidate.claimLedger,
    nextAction: candidate.nextAction,
  };
}

function mapPage(row: Record<string, unknown>, sources: SeoSource[] = [], internalLinks: SeoInternalLink[] = []): SeoContentPage {
  const extractedSources = sources.length > 0 ? sources : extractSources(row);
  const extractedLinks = internalLinks.length > 0 ? internalLinks : extractLinks(row);

  return {
    id: String(row.id),
    slug: String(row.slug),
    language: String(row.language ?? "en"),
    pageType: String(row.page_type) as SeoPageType,
    title: String(row.title),
    description: String(row.description),
    body: parseBody(row.body),
    framework: row.framework ? String(row.framework) : null,
    jurisdiction: row.jurisdiction ? String(row.jurisdiction) : null,
    primaryKeyword: row.primary_keyword ? String(row.primary_keyword) : null,
    searchIntent: row.search_intent ? String(row.search_intent) : null,
    targetTool: row.target_tool ? String(row.target_tool) : null,
    qualityScore: Number(row.quality_score ?? 0),
    reviewStatus: String(row.review_status ?? "draft") as SeoContentPage["reviewStatus"],
    legalInterpretation: Boolean(row.legal_interpretation),
    canonicalUrl: row.canonical_url ? String(row.canonical_url) : null,
    noindex: Boolean(row.noindex),
    publishedAt: row.published_at ? String(row.published_at) : null,
    updatedAt: String(row.updated_at ?? now),
    sources: extractedSources,
    internalLinks: extractedLinks,
  };
}

function extractSources(row: Record<string, unknown>): SeoSource[] {
  const relations = Array.isArray(row.content_sources) ? row.content_sources : [];
  return relations.flatMap((relation) => {
    if (!relation || typeof relation !== "object") return [];
    const sourceRelation = relation as Record<string, unknown>;
    const source = sourceRelation.source_documents;
    if (!source || typeof source !== "object") return [];
    const document = source as Record<string, unknown>;
    return [{
      authority: String(document.authority ?? "Unknown authority"),
      title: String(document.title ?? "Untitled source"),
      sourceUrl: String(document.source_url ?? "#"),
      publishedAt: document.published_at ? String(document.published_at) : null,
      effectiveAt: document.effective_at ? String(document.effective_at) : null,
      supportedClaim: sourceRelation.supported_claim ? String(sourceRelation.supported_claim) : undefined,
    }];
  });
}

function extractLinks(row: Record<string, unknown>): SeoInternalLink[] {
  const relations = Array.isArray(row.content_links) ? row.content_links : [];
  return relations.flatMap((relation) => {
    if (!relation || typeof relation !== "object") return [];
    const link = relation as Record<string, unknown>;
    const href = link.target_url ? String(link.target_url) : null;
    if (!href) return [];
    return [{
      href,
      label: String(link.anchor_text ?? href),
      relationship: link.relationship ? String(link.relationship) : "related",
    }];
  });
}

const contentSelect = `
  *,
  content_sources(
    supported_claim,
    source_documents(authority,title,source_url,published_at,effective_at)
  ),
  content_links(target_url,anchor_text,relationship)
`;

export function isIndexablePage(page: SeoContentPage): boolean {
  return page.reviewStatus === "published" && !page.noindex && page.qualityScore >= 80;
}

export async function getIndexedContentPages(): Promise<SeoContentPage[]> {
  const supabase = getSeoSupabase();
  if (!supabase) {
    const generated = await listGeneratedContentPages();
    return [...generated, ...seedPages].filter(isIndexablePage);
  }

  const { data, error } = await supabase
    .from("content_pages")
    .select(contentSelect)
    .eq("review_status", "published")
    .eq("noindex", false)
    .gte("quality_score", 80)
    .order("published_at", { ascending: false });

  if (error || !data) return seedPages.filter(isIndexablePage);
  return data.map((row) => mapPage(row));
}

export async function getAuthorityInventoryPages(): Promise<SeoContentPage[]> {
  const indexedPages = await getIndexedContentPages();
  const authorityPages = indexedPages.filter((page) => {
    const target = page.targetTool ?? page.body.nextAction?.href ?? "";
    const actionLabel = page.body.nextAction?.label ?? "";
    return !target.startsWith("/assess/") && !/assessment/i.test(actionLabel);
  });
  const combined = [...seedPages.filter(isIndexablePage), ...authorityPages];
  const seen = new Set<string>();
  return combined.filter((page) => {
    const key = `${page.pageType}:${page.framework ?? ""}:${page.slug}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function getSeoPageByRoute(pageType: SeoPageType, slug: string, framework?: string): Promise<SeoContentPage | null> {
  const supabase = getSeoSupabase();
  if (!supabase) {
    const generated = await listGeneratedContentPages();
    return [...generated, ...seedPages].find((page) => page.pageType === pageType && page.slug === slug && (!framework || page.framework === framework)) ?? null;
  }

  let query = supabase.from("content_pages").select(contentSelect).eq("page_type", pageType).eq("slug", slug).limit(1);
  if (framework) query = query.eq("framework", framework);
  const { data, error } = await query.maybeSingle();
  if (error || !data) {
    return seedPages.find((page) => page.pageType === pageType && page.slug === slug && (!framework || page.framework === framework)) ?? null;
  }

  return mapPage(data);
}

export async function getSeoPagesForFramework(framework: string): Promise<SeoContentPage[]> {
  const pages = await getIndexedContentPages();
  return pages.filter((page) => page.framework === framework);
}

export async function getAllSeoPages(): Promise<SeoContentPage[]> {
  const supabase = getSeoSupabase();
  if (!supabase) {
    const generated = await listGeneratedContentPages();
    return [...generated, ...seedPages];
  }

  const { data, error } = await supabase
    .from("content_pages")
    .select(contentSelect)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error || !data) return seedPages;
  return data.map((row) => mapPage(row));
}

export async function getPendingSeoPages(): Promise<SeoContentPage[]> {
  const supabase = getSeoSupabase();
  if (!supabase) {
    const generated = await listGeneratedContentPages();
    return [...generated, ...seedPages].filter((page) => page.reviewStatus === "review" || page.reviewStatus === "draft");
  }

  const { data, error } = await supabase
    .from("content_pages")
    .select(contentSelect)
    .in("review_status", ["draft", "review"])
    .order("updated_at", { ascending: true })
    .limit(25);

  if (error || !data) return [];
  return data.map((row) => mapPage(row));
}
