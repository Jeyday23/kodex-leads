// WS3 hiring-signal providers. Neither adapter is called at all when its
// credentials are missing - status() and run() agree on the same check, and
// run() re-checks before ever calling fetch, so an unconfigured provider
// never touches the network.

import type { SignalConfig } from "@/lib/growth/context";
import type { SignalEventDraft, SignalProvider, SignalProviderStatus } from "../types";

const HIRING_KEYWORDS = ["compliance", "data protection", "privacy", "dpo", "security officer", "risk manager", "ciso", "gdpr", "ai governance"];

function matchesHiringKeyword(text: string): boolean {
  const normalized = text.toLowerCase();
  return HIRING_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function targetsOrKeywords(config: SignalConfig): string[] {
  return config.targets.length > 0 ? config.targets : HIRING_KEYWORDS;
}

interface JSearchJob {
  job_title?: string;
  employer_name?: string;
  employer_website?: string;
  job_apply_link?: string;
  job_posted_at_datetime_utc?: string;
  job_id?: string;
}

export const jSearchHiringProvider: SignalProvider = {
  id: "hiring-jsearch",
  label: "Hiring signals (JSearch)",
  status(): SignalProviderStatus {
    const configured = Boolean(process.env.JSEARCH_API_KEY);
    return { configured, missing: configured ? [] : ["JSEARCH_API_KEY"] };
  },
  async run(config: SignalConfig): Promise<SignalEventDraft[]> {
    const status = this.status();
    if (!status.configured) return [];

    const apiKey = process.env.JSEARCH_API_KEY as string;
    const events: SignalEventDraft[] = [];

    for (const query of targetsOrKeywords(config)) {
      try {
        const response = await fetch(
          `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&num_pages=1`,
          {
            headers: {
              "X-RapidAPI-Key": apiKey,
              "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
            },
            signal: AbortSignal.timeout(10_000),
          },
        );
        if (!response.ok) continue;

        const payload: unknown = await response.json();
        const jobs: JSearchJob[] = Array.isArray((payload as Record<string, unknown>)?.data)
          ? ((payload as Record<string, unknown>).data as JSearchJob[])
          : [];

        for (const job of jobs) {
          const title = job.job_title ?? "";
          if (!matchesHiringKeyword(title)) continue;
          const company = job.employer_name ?? "Unknown company";
          const id = job.job_id ?? `${company}:${title}`;
          events.push({
            type: "hiring",
            source: "jsearch",
            companyName: company,
            companyDomain: job.employer_website,
            evidence: { title, applyLink: job.job_apply_link, matchedQuery: query },
            url: job.job_apply_link,
            strength: 0.6,
            dedupeKey: `hiring:jsearch:${id}`,
            detectedAt: job.job_posted_at_datetime_utc ?? new Date().toISOString(),
          });
        }
      } catch {
        // A single query failing must not fail the whole provider run.
        continue;
      }
    }

    return events;
  },
};

interface AdzunaJob {
  id?: string;
  title?: string;
  company?: { display_name?: string };
  redirect_url?: string;
  created?: string;
}

export const adzunaHiringProvider: SignalProvider = {
  id: "hiring-adzuna",
  label: "Hiring signals (Adzuna)",
  status(): SignalProviderStatus {
    const missing: string[] = [];
    if (!process.env.ADZUNA_APP_ID) missing.push("ADZUNA_APP_ID");
    if (!process.env.ADZUNA_APP_KEY) missing.push("ADZUNA_APP_KEY");
    return { configured: missing.length === 0, missing };
  },
  async run(config: SignalConfig): Promise<SignalEventDraft[]> {
    const status = this.status();
    if (!status.configured) return [];

    const appId = process.env.ADZUNA_APP_ID as string;
    const appKey = process.env.ADZUNA_APP_KEY as string;
    const events: SignalEventDraft[] = [];

    for (const query of targetsOrKeywords(config)) {
      try {
        const url = new URL("https://api.adzuna.com/v1/api/jobs/de/search/1");
        url.searchParams.set("app_id", appId);
        url.searchParams.set("app_key", appKey);
        url.searchParams.set("what", query);
        url.searchParams.set("content-type", "application/json");

        const response = await fetch(url.toString(), { signal: AbortSignal.timeout(10_000) });
        if (!response.ok) continue;

        const payload: unknown = await response.json();
        const jobs: AdzunaJob[] = Array.isArray((payload as Record<string, unknown>)?.results)
          ? ((payload as Record<string, unknown>).results as AdzunaJob[])
          : [];

        for (const job of jobs) {
          const title = job.title ?? "";
          if (!matchesHiringKeyword(title)) continue;
          const company = job.company?.display_name ?? "Unknown company";
          const id = job.id ?? `${company}:${title}`;
          events.push({
            type: "hiring",
            source: "adzuna",
            companyName: company,
            evidence: { title, matchedQuery: query },
            url: job.redirect_url,
            strength: 0.55,
            dedupeKey: `hiring:adzuna:${id}`,
            detectedAt: job.created ?? new Date().toISOString(),
          });
        }
      } catch {
        continue;
      }
    }

    return events;
  },
};
