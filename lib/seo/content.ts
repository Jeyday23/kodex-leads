import type { SeoContentBody, SeoContentPage, SeoInternalLink, SeoPageType, SeoSource } from "./types";
import { getSeoSupabase } from "./db";

const now = "2026-07-31T00:00:00.000Z";

const seedSources: SeoSource[] = [
  {
    authority: "Google Search Central",
    title: "Search Essentials",
    sourceUrl: "https://developers.google.com/search/docs/essentials",
    publishedAt: "2024-01-01T00:00:00.000Z",
    supportedClaim: "Indexable pages need crawlable URLs, useful content, accurate metadata and clear page purpose.",
  },
  {
    authority: "Answer Engine Optimization Operations",
    title: "Machine-readable content inventory",
    sourceUrl: "https://llmstxt.org/",
    publishedAt: "2024-08-01T00:00:00.000Z",
    supportedClaim: "LLM discovery improves when canonical pages, summaries and source links are exposed in predictable machine-readable formats.",
  },
];

const baseBody: SeoContentBody = {
  summary:
    "The SEO engine turns search demand into structured pages, LLM-readable context, attribution events and scored leads.",
  keyFacts: [
    "Indexable pages require clear intent, crawlable URLs, source support and structured metadata.",
    "LLM-ready pages need concise answer sections, canonical references and machine-readable discovery feeds.",
    "Weak or duplicate pages remain noindex until remediated.",
  ],
  sections: [
    {
      heading: "Search demand",
      body:
        "The system tracks topic opportunities, ranks them by commercial value and publishes only pages with distinct search intent.",
    },
    {
      heading: "LLM discovery",
      body:
        "Every indexable page can appear in sitemap XML, llms.txt and a JSON AI sitemap so retrieval systems can identify canonical URLs and summaries.",
    },
    {
      heading: "Traffic conversion",
      body:
        "High-intent visitors are routed into assessment forms where landing page, query cluster and content attribution are preserved for lead scoring.",
    },
  ],
  nextAction: { label: "Run the SEO traffic assessment", href: "/assess/seo" },
};

const seedPages: SeoContentPage[] = [
  {
    id: "seed-seo-llm-discovery",
    slug: "llm-discovery",
    language: "en",
    pageType: "learn",
    title: "LLM Discovery SEO Process",
    description: "How to structure crawlable, citeable pages for Google, ChatGPT, Claude, Perplexity and other answer engines.",
    body: baseBody,
    framework: "seo",
    jurisdiction: "Global",
    primaryKeyword: "llm seo process",
    searchIntent: "answer-engine-optimization",
    targetTool: "/assess/seo",
    qualityScore: 92,
    reviewStatus: "published",
    legalInterpretation: false,
    canonicalUrl: null,
    noindex: false,
    publishedAt: now,
    updatedAt: now,
    sources: seedSources,
    internalLinks: [
      { href: "/assess/seo", label: "SEO traffic assessment", relationship: "conversion" },
      { href: "/deadlines/seo", label: "SEO automation cadence", relationship: "cluster" },
      { href: "/compare/google-vs-llm-search", label: "Google vs LLM search", relationship: "cluster" },
    ],
  },
  {
    id: "seed-seo-cadence",
    slug: "seo",
    language: "en",
    pageType: "deadline",
    title: "SEO Automation Cadence",
    description: "A practical operating cadence for source checks, publishing, LLM discovery updates and traffic-to-lead measurement.",
    body: {
      ...baseBody,
      nextAction: { label: "Check SEO automation readiness", href: "/assess/seo" },
    },
    framework: "seo",
    jurisdiction: "Global",
    primaryKeyword: "seo automation cadence",
    searchIntent: "operations",
    targetTool: "/assess/seo",
    qualityScore: 90,
    reviewStatus: "published",
    legalInterpretation: false,
    canonicalUrl: null,
    noindex: false,
    publishedAt: now,
    updatedAt: now,
    sources: seedSources,
    internalLinks: [
      { href: "/learn/seo/llm-discovery", label: "LLM discovery SEO process", relationship: "parent" },
      { href: "/assess/seo", label: "SEO traffic assessment", relationship: "conversion" },
      { href: "/compare/google-vs-llm-search", label: "Google vs LLM search", relationship: "cluster" },
    ],
  },
  {
    id: "seed-google-vs-llm-search",
    slug: "google-vs-llm-search",
    language: "en",
    pageType: "compare",
    title: "Google Search vs LLM Discovery",
    description: "How SEO infrastructure can serve both traditional search crawlers and AI answer-engine retrieval systems.",
    body: {
      ...baseBody,
      nextAction: { label: "Assess SEO traffic readiness", href: "/assess/seo" },
    },
    framework: "seo",
    jurisdiction: "Global",
    primaryKeyword: "google search vs llm discovery",
    searchIntent: "comparison",
    targetTool: "/assess/seo",
    qualityScore: 88,
    reviewStatus: "published",
    legalInterpretation: false,
    canonicalUrl: null,
    noindex: false,
    publishedAt: now,
    updatedAt: now,
    sources: seedSources,
    internalLinks: [
      { href: "/learn/seo/llm-discovery", label: "LLM discovery SEO process", relationship: "cluster" },
      { href: "/llms.txt", label: "LLM discovery file", relationship: "machine-readable" },
      { href: "/api/seo/ai-sitemap", label: "AI sitemap", relationship: "machine-readable" },
    ],
  },
  {
    id: "seed-answer-engine-readiness",
    slug: "readiness-signals",
    language: "en",
    pageType: "enforcement",
    title: "Answer Engine Readiness Signals",
    description: "Review-gated guidance for evaluating whether pages are likely to be understood, cited and converted by AI search systems.",
    body: baseBody,
    framework: "seo",
    jurisdiction: "Global",
    primaryKeyword: "answer engine optimization readiness",
    searchIntent: "llm-visibility",
    targetTool: "/assess/seo",
    qualityScore: 84,
    reviewStatus: "review",
    legalInterpretation: true,
    canonicalUrl: null,
    noindex: true,
    publishedAt: null,
    updatedAt: now,
    sources: seedSources,
    internalLinks: [
      { href: "/learn/seo/llm-discovery", label: "LLM discovery SEO process", relationship: "parent" },
      { href: "/deadlines/seo", label: "SEO automation cadence", relationship: "cluster" },
      { href: "/assess/seo", label: "SEO traffic assessment", relationship: "conversion" },
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
  if (!supabase) return seedPages.filter(isIndexablePage);

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

export async function getSeoPageByRoute(pageType: SeoPageType, slug: string, framework?: string): Promise<SeoContentPage | null> {
  const supabase = getSeoSupabase();
  if (!supabase) {
    return seedPages.find((page) => page.pageType === pageType && page.slug === slug && (!framework || page.framework === framework)) ?? null;
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
  if (!supabase) return seedPages;

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
  if (!supabase) return seedPages.filter((page) => page.reviewStatus === "review" || page.reviewStatus === "draft");

  const { data, error } = await supabase
    .from("content_pages")
    .select(contentSelect)
    .in("review_status", ["draft", "review"])
    .order("updated_at", { ascending: true })
    .limit(25);

  if (error || !data) return [];
  return data.map((row) => mapPage(row));
}
