import { createHash } from "node:crypto";
import { normalizeFramework } from "./config";
import type { SeoContentPage, SeoPageType } from "./types";
import type { SourceCheckResult } from "./source-intelligence";

export interface TopicGraphNode {
  primaryKeyword: string;
  searchIntent: string;
  framework: string;
  jurisdiction: string;
  pageType: SeoPageType;
  targetTool: string;
  businessValue: number;
  opportunityScore: number;
  sourceUrls: string[];
  reason: string;
}

const baseTopics: TopicGraphNode[] = [
  {
    primaryKeyword: "EU AI Act high-risk obligations",
    searchIntent: "deadline-readiness",
    framework: "eu-ai-act",
    jurisdiction: "EU",
    pageType: "learn",
    targetTool: "/assess/eu-ai-act",
    businessValue: 95,
    opportunityScore: 92,
    sourceUrls: ["https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689"],
    reason: "High-intent teams need a concise path from obligations to readiness assessment.",
  },
  {
    primaryKeyword: "EU AI Act deadline August 2026",
    searchIntent: "deadline",
    framework: "eu-ai-act",
    jurisdiction: "EU",
    pageType: "deadline",
    targetTool: "/assess/eu-ai-act",
    businessValue: 94,
    opportunityScore: 90,
    sourceUrls: ["https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai"],
    reason: "Deadline queries carry strong urgency and assessment intent.",
  },
  {
    primaryKeyword: "NIS2 readiness for SaaS founders",
    searchIntent: "founder-readiness",
    framework: "nis2",
    jurisdiction: "DACH",
    pageType: "learn",
    targetTool: "/assess/nis2",
    businessValue: 82,
    opportunityScore: 78,
    sourceUrls: ["https://digital-strategy.ec.europa.eu/en/policies/nis2-directive"],
    reason: "DACH software companies often need a first compliance triage before buying tooling.",
  },
  {
    primaryKeyword: "GDPR AI data protection assessment",
    searchIntent: "assessment",
    framework: "gdpr",
    jurisdiction: "EU",
    pageType: "learn",
    targetTool: "/assess/gdpr",
    businessValue: 86,
    opportunityScore: 80,
    sourceUrls: ["https://edpb.europa.eu/our-work-tools/our-documents/guidelines_en"],
    reason: "AI teams evaluating customer-facing systems also need privacy readiness routing.",
  },
  {
    primaryKeyword: "Vanta vs Kodex EU compliance",
    searchIntent: "comparison",
    framework: "gdpr",
    jurisdiction: "EU",
    pageType: "compare",
    targetTool: "/assess/gdpr",
    businessValue: 90,
    opportunityScore: 82,
    sourceUrls: ["https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689"],
    reason: "Comparison searches can convert teams who already know they need a compliance system.",
  },
];

export function slugForTopic(topic: Pick<TopicGraphNode, "primaryKeyword" | "framework" | "pageType">): string {
  if (topic.pageType === "deadline") return normalizeFramework(topic.framework);
  return normalizeFramework(topic.primaryKeyword).replace(/^eu-ai-act-/, "").slice(0, 72).replace(/-$/, "");
}

export function deriveTopicGraph(sourceChecks: SourceCheckResult[], existingPages: SeoContentPage[]): TopicGraphNode[] {
  const queryGaps = (process.env.SEO_QUERY_GAPS ?? "")
    .split(",")
    .map((query) => query.trim())
    .filter(Boolean)
    .map((query): TopicGraphNode => ({
      primaryKeyword: query,
      searchIntent: "search-console-gap",
      framework: inferFramework(query),
      jurisdiction: inferFramework(query) === "nis2" ? "DACH" : "EU",
      pageType: "learn",
      targetTool: `/assess/${inferFramework(query)}`,
      businessValue: 72,
      opportunityScore: 74,
      sourceUrls: sourceChecks.map((source) => source.url),
      reason: "Configured Search Console query gap.",
    }));

  const changedSourceTopics = sourceChecks
    .filter((source) => source.status === "changed")
    .map((source): TopicGraphNode => ({
      primaryKeyword: `${source.name} update readiness`,
      searchIntent: "source-change-refresh",
      framework: source.name.toLowerCase().includes("nis") ? "nis2" : "eu-ai-act",
      jurisdiction: "EU",
      pageType: "learn",
      targetTool: source.name.toLowerCase().includes("nis") ? "/assess/nis2" : "/assess/eu-ai-act",
      businessValue: 88,
      opportunityScore: 88,
      sourceUrls: [source.url],
      reason: `Monitored source changed: ${source.name}.`,
    }));

  const byRoute = new Map<string, TopicGraphNode>();
  for (const topic of [...changedSourceTopics, ...queryGaps, ...baseTopics]) {
    const routeKey = `${topic.pageType}:${topic.framework}:${slugForTopic(topic)}`;
    const existing = existingPages.find((page) => `${page.pageType}:${page.framework ?? ""}:${page.slug}` === routeKey);
    if (existing && topic.searchIntent !== "source-change-refresh") continue;
    const current = byRoute.get(routeKey);
    if (!current || topic.opportunityScore > current.opportunityScore) byRoute.set(routeKey, topic);
  }
  return [...byRoute.values()].sort((a, b) => b.opportunityScore - a.opportunityScore).slice(0, 8);
}

function inferFramework(query: string): string {
  const normalized = query.toLowerCase();
  if (normalized.includes("nis")) return "nis2";
  if (normalized.includes("gdpr") || normalized.includes("privacy") || normalized.includes("data protection")) return "gdpr";
  if (normalized.includes("dora")) return "dora";
  if (normalized.includes("cra") || normalized.includes("cyber resilience")) return "cra";
  return "eu-ai-act";
}

export function stableTopicId(topic: TopicGraphNode): string {
  return `generated-${createHash("sha1").update(`${topic.pageType}:${topic.framework}:${slugForTopic(topic)}`).digest("hex").slice(0, 16)}`;
}
