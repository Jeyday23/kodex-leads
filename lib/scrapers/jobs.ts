import { type ScraperResult, delay } from "./types";

const KEYWORDS = [
  "Data Protection Officer",
  "DPO",
  "Compliance Officer",
  "Datenschutzbeauftragter",
  "GDPR",
  "EU AI Act",
];

const ARBEITNOW_BASE = "https://www.arbeitnow.com/api/job-board-api";

export async function scrapeJobs(): Promise<ScraperResult> {
  const leads: ScraperResult["leads"] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const keyword of KEYWORDS) {
    try {
      const url = `${ARBEITNOW_BASE}?search=${encodeURIComponent(keyword)}&page=1`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        errors.push(`Arbeitnow ${keyword}: HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();
      const jobs = data.data ?? [];

      for (const job of jobs) {
        const company = (job.company_name ?? "").trim();
        const normalized = company.toLowerCase();
        if (!company || seen.has(normalized)) continue;
        seen.add(normalized);

        const location = (job.location ?? "").toLowerCase();
        const isDACH =
          location.includes("germany") ||
          location.includes("austria") ||
          location.includes("switzerland") ||
          location.includes("deutschland") ||
          location.includes("berlin") ||
          location.includes("munich") ||
          location.includes("vienna") ||
          location.includes("zurich");

        if (!isDACH) continue;

        leads.push({
          company,
          source_url: job.url ?? `https://www.arbeitnow.com`,
          source: "scraper_jobs",
        });
      }

      await delay(1000);
    } catch (err) {
      errors.push(`Arbeitnow ${keyword}: ${String(err)}`);
    }
  }

  return { leads, errors };
}
