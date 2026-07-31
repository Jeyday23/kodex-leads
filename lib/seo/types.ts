export type SeoPageType = "learn" | "compare" | "deadline" | "enforcement" | "hub";

export type SeoReviewStatus = "draft" | "review" | "approved" | "published" | "rejected" | "archived";

export interface SeoSource {
  authority: string;
  title: string;
  sourceUrl: string;
  publishedAt?: string | null;
  effectiveAt?: string | null;
  supportedClaim?: string;
}

export interface SeoInternalLink {
  href: string;
  label: string;
  relationship?: string;
}

export interface SeoSection {
  heading: string;
  body: string;
  claims?: string[];
}

export interface SeoContentBody {
  summary: string;
  sections: SeoSection[];
  keyFacts?: string[];
  nextAction?: {
    label: string;
    href: string;
  };
}

export interface SeoContentPage {
  id: string;
  slug: string;
  language: string;
  pageType: SeoPageType;
  title: string;
  description: string;
  body: SeoContentBody;
  framework?: string | null;
  jurisdiction?: string | null;
  primaryKeyword?: string | null;
  searchIntent?: string | null;
  targetTool?: string | null;
  qualityScore: number;
  reviewStatus: SeoReviewStatus;
  legalInterpretation: boolean;
  canonicalUrl?: string | null;
  noindex: boolean;
  publishedAt?: string | null;
  updatedAt: string;
  sources: SeoSource[];
  internalLinks: SeoInternalLink[];
}

export interface SeoMetricSnapshot {
  contentId: string;
  metricDate: string;
  searchQuery?: string | null;
  impressions: number;
  clicks: number;
  averagePosition?: number | null;
  assessmentStarts: number;
  leads: number;
  qualifiedLeads: number;
  conversions: number;
  revenue: number;
}

export interface LeadCaptureInput {
  email: string;
  companyName: string;
  framework: string;
  companySize: "1-10" | "11-50" | "51-200" | "201-1000" | "1000+";
  aiUse: "none" | "evaluating" | "internal" | "customer-facing" | "high-risk";
  complianceMaturity: "unknown" | "starting" | "documented" | "audited";
  urgency: "researching" | "this-quarter" | "this-month" | "immediate";
  landingPage: string;
  contentId?: string | null;
  searchQueryCluster?: string | null;
}

export interface LeadScoreResult {
  score: number;
  grade: "low" | "medium" | "high" | "sales-ready";
  reasons: string[];
  recommendedAction: "nurture" | "send-assessment" | "sales-review" | "book-demo";
}
