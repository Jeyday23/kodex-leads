export interface ScrapedLead {
  company: string;
  email?: string;
  source_url: string;
  source: string;
  team_size?: string;
  uses_ai?: boolean;
}

export interface ScraperResult {
  leads: ScrapedLead[];
  errors: string[];
}

export interface EnrichResult {
  company: string;
  email: string | null;
  provider: string | null;
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
