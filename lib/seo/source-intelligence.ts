import { createHash } from "node:crypto";

export interface SourceCheckResult {
  name: string;
  url: string;
  status: "configured" | "changed" | "unchanged" | "unavailable";
  contentHash?: string;
  note?: string;
}

const approvedSources = [
  {
    name: "Google Search Essentials",
    url: "https://developers.google.com/search/docs/essentials",
  },
  {
    name: "LLM discovery file convention",
    url: "https://llmstxt.org/",
  },
];

export function getApprovedSourceList() {
  return approvedSources;
}

export async function checkApprovedSources(): Promise<SourceCheckResult[]> {
  if (process.env.SEO_SOURCE_FETCH_ENABLED !== "true") {
    return approvedSources.map((source) => ({
      ...source,
      status: "configured",
      note: "Set SEO_SOURCE_FETCH_ENABLED=true to fetch and hash approved SEO source pages during cron.",
    }));
  }

  const checks: SourceCheckResult[] = [];
  for (const source of approvedSources) {
    try {
      const response = await fetch(source.url, { headers: { "user-agent": "Kodex SEO monitor" } });
      if (!response.ok) {
        checks.push({ ...source, status: "unavailable", note: `HTTP ${response.status}` });
        continue;
      }

      const text = await response.text();
      checks.push({
        ...source,
        status: "unchanged",
        contentHash: createHash("sha256").update(text).digest("hex"),
      });
    } catch (error) {
      checks.push({
        ...source,
        status: "unavailable",
        note: error instanceof Error ? error.message : "Unknown fetch error",
      });
    }
  }

  return checks;
}

export function searchConsoleStatus() {
  const configured = Boolean(process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL && process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY);
  return {
    status: configured ? "configured" : "missing_credentials",
    note: configured
      ? "Search Console credentials are present for metric ingestion."
      : "Set GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL and GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY to ingest live query data.",
  };
}
