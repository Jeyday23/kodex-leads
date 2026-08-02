import { createHash } from "node:crypto";
import { getSourceSnapshot, storeSourceSnapshot } from "./local-store";

export interface SourceCheckResult {
  name: string;
  url: string;
  status: "configured" | "changed" | "unchanged" | "unavailable";
  contentHash?: string;
  note?: string;
}

const approvedSources = [
  {
    name: "EU Artificial Intelligence Act",
    url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689",
  },
  {
    name: "European Commission AI Act policy",
    url: "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai",
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
      note: "Set SEO_SOURCE_FETCH_ENABLED=true to fetch and hash approved compliance source pages during cron.",
    }));
  }

  const checks: SourceCheckResult[] = [];
  for (const source of approvedSources) {
    try {
      const response = await fetch(source.url, { headers: { "user-agent": "Kodex compliance monitor" } });
      if (!response.ok) {
        checks.push({ ...source, status: "unavailable", note: `HTTP ${response.status}` });
        continue;
      }

      const text = await response.text();
      const contentHash = createHash("sha256").update(text).digest("hex");
      const previous = await getSourceSnapshot(source.url);
      await storeSourceSnapshot(source.url, contentHash, new Date().toISOString());
      checks.push({
        ...source,
        status: previous && previous.contentHash !== contentHash ? "changed" : "unchanged",
        contentHash,
        note: previous ? undefined : "Initial retrieval hash stored for future change detection.",
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
