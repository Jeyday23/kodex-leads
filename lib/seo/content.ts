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
    "Kodex turns EU compliance pressure into a source-backed assessment path, prioritized remediation and measurable follow-up.",
  keyFacts: [
    "Source-backed scans separate factual obligations from interpretation-heavy review.",
    "High-risk AI, privacy, cyber and resilience obligations can overlap across teams.",
    "Every assessment preserves landing-page and framework attribution for lead quality measurement.",
  ],
  sections: [
    {
      heading: "What to check first",
      body:
        "Start with the framework, system role, company context, timeline and existing evidence before selecting controls or tools.",
    },
    {
      heading: "How Kodex verifies",
      body:
        "Claude synthesis, batch evaluation, a skeptic pass and counselor verification combine automation speed with human review where interpretation matters.",
    },
    {
      heading: "What happens next",
      body:
        "The assessment produces a scored readiness signal, routes high-intent teams to follow-up and keeps weak or unsupported content out of the public index.",
    },
  ],
  nextAction: { label: "Run the EU AI Act assessment", href: "/assess/eu-ai-act" },
};

const seedPages: SeoContentPage[] = [
  {
    id: "seed-eu-ai-act-high-risk",
    slug: "high-risk-obligations",
    language: "en",
    pageType: "learn",
    title: "EU AI Act High-Risk Obligations",
    description: "A source-backed entry point for teams deploying or operating high-risk AI systems before enforcement deadlines.",
    body: baseBody,
    framework: "eu-ai-act",
    jurisdiction: "EU",
    primaryKeyword: "eu ai act high risk obligations",
    searchIntent: "deadline-readiness",
    targetTool: "/assess/eu-ai-act",
    qualityScore: 92,
    reviewStatus: "published",
    legalInterpretation: false,
    canonicalUrl: null,
    noindex: false,
    publishedAt: now,
    updatedAt: now,
    sources: seedSources,
    internalLinks: [
      { href: "/assess/eu-ai-act", label: "EU AI Act assessment", relationship: "conversion" },
      { href: "/deadlines/eu-ai-act", label: "EU AI Act deadlines", relationship: "cluster" },
      { href: "/compare/vanta-vs-kodex", label: "Vanta vs Kodex", relationship: "cluster" },
    ],
  },
  {
    id: "seed-eu-ai-act-deadline",
    slug: "eu-ai-act",
    language: "en",
    pageType: "deadline",
    title: "EU AI Act Enforcement Deadline",
    description: "Deadline-focused guidance for high-risk AI Act readiness and assessment routing.",
    body: {
      ...baseBody,
      nextAction: { label: "Check AI Act readiness", href: "/assess/eu-ai-act" },
    },
    framework: "eu-ai-act",
    jurisdiction: "EU",
    primaryKeyword: "eu ai act deadline august 2026",
    searchIntent: "deadline",
    targetTool: "/assess/eu-ai-act",
    qualityScore: 90,
    reviewStatus: "published",
    legalInterpretation: false,
    canonicalUrl: null,
    noindex: false,
    publishedAt: now,
    updatedAt: now,
    sources: seedSources,
    internalLinks: [
      { href: "/learn/eu-ai-act/high-risk-obligations", label: "High-risk obligations", relationship: "parent" },
      { href: "/assess/eu-ai-act", label: "EU AI Act assessment", relationship: "conversion" },
      { href: "/compare/vanta-vs-kodex", label: "Vanta vs Kodex", relationship: "cluster" },
    ],
  },
  {
    id: "seed-vanta-vs-kodex",
    slug: "vanta-vs-kodex",
    language: "en",
    pageType: "compare",
    title: "Vanta vs Kodex for EU Compliance",
    description: "A comparison of US-centric compliance tooling and EU-native compliance depth for AI Act, NIS2, DORA and GDPR teams.",
    body: {
      ...baseBody,
      nextAction: { label: "Assess framework coverage", href: "/assess/gdpr" },
    },
    framework: "gdpr",
    jurisdiction: "EU",
    primaryKeyword: "vanta vs kodex eu compliance",
    searchIntent: "comparison",
    targetTool: "/assess/gdpr",
    qualityScore: 88,
    reviewStatus: "published",
    legalInterpretation: false,
    canonicalUrl: null,
    noindex: false,
    publishedAt: now,
    updatedAt: now,
    sources: seedSources,
    internalLinks: [
      { href: "/learn/eu-ai-act/high-risk-obligations", label: "AI Act high-risk obligations", relationship: "cluster" },
      { href: "/assess/gdpr", label: "GDPR assessment", relationship: "conversion" },
      { href: "/deadlines/eu-ai-act", label: "AI Act deadlines", relationship: "cluster" },
    ],
  },
  {
    id: "seed-nis2-saas-founders",
    slug: "saas-founder-readiness",
    language: "en",
    pageType: "learn",
    title: "NIS2 Readiness for SaaS Founders",
    description: "A practical starting point for DACH SaaS founders evaluating cyber and compliance exposure.",
    body: baseBody,
    framework: "nis2",
    jurisdiction: "EU",
    primaryKeyword: "nis2 readiness saas founders",
    searchIntent: "self-serve-assessment",
    targetTool: "/assess/nis2",
    qualityScore: 84,
    reviewStatus: "published",
    legalInterpretation: false,
    canonicalUrl: null,
    noindex: false,
    publishedAt: now,
    updatedAt: now,
    sources: seedSources,
    internalLinks: [
      { href: "/assess/nis2", label: "NIS2 assessment", relationship: "conversion" },
      { href: "/compare/vanta-vs-kodex", label: "Vanta vs Kodex", relationship: "cluster" },
      { href: "/deadlines/eu-ai-act", label: "AI Act deadlines", relationship: "cluster" },
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
