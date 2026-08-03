export type AuthorityProviderId = "openai" | "anthropic" | "perplexity";

export interface MonitoringPrompt {
  id: string;
  projectId: string;
  label: string;
  prompt: string;
  promptGroup: string;
  searchMode: string;
  country: string;
  language: string;
  active: boolean;
}

export interface MonitoringProviderInput {
  prompt: string;
  country?: string;
  language?: string;
}

export interface MonitoringProviderResult {
  answer: string;
  citations: Array<{
    title?: string;
    url: string;
  }>;
  model: string;
  rawResponse?: unknown;
  latencyMs: number;
  estimatedCost?: number;
}

export interface MonitoringProvider {
  name: AuthorityProviderId;
  label: string;
  configured: boolean;
  missing: string[];
  execute(input: MonitoringProviderInput): Promise<MonitoringProviderResult>;
}

export interface CitationExtraction {
  title?: string;
  url: string;
  domain: string;
  position: number;
  citesKodex: boolean;
}

export interface BrandExtraction {
  mentioned: boolean;
  sentiment: "positive" | "neutral" | "negative";
  recommendationStrength: number;
  evidence?: string;
}

export interface CompetitorExtraction {
  name: string;
  mentioned: boolean;
  citationCount: number;
}

export interface MonitoringResponseRecord {
  provider: AuthorityProviderId;
  model: string;
  answer: string;
  citations: CitationExtraction[];
  brand: BrandExtraction;
  competitors: CompetitorExtraction[];
  rawResponse?: unknown;
  latencyMs: number;
  estimatedCost?: number;
  extractionConfidence: number;
}

export interface MonitoringRunRecord {
  id: string;
  prompt: MonitoringPrompt;
  status: "completed" | "failed";
  startedAt: string;
  completedAt: string;
  responses: MonitoringResponseRecord[];
  error?: string;
}

export interface AuthorityOverview {
  visibilityScore: number;
  citationRate: number;
  mentionRate: number;
  recentMovement: number;
  promptCount: number;
  responseCount: number;
  providerCount: number;
  failureCount: number;
}
