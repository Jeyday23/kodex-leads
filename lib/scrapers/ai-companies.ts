import { type ScraperResult, delay } from "./types";

const PH_RSS = "https://www.producthunt.com/categories/artificial-intelligence/rss";
const GH_TRENDING = "https://api.github.com/search/repositories";

export async function scrapeAICompanies(): Promise<ScraperResult> {
  const leads: ScraperResult["leads"] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  // Product Hunt AI category RSS
  try {
    const res = await fetch(PH_RSS, {
      headers: { Accept: "application/xml, text/xml" },
      signal: AbortSignal.timeout(15000),
    });

    if (res.ok) {
      const xml = await res.text();
      const items = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];

      for (const item of items.slice(0, 20)) {
        const titleMatch = item.match(/<title>(.*?)<\/title>/);
        const linkMatch = item.match(/<link>(.*?)<\/link>/);
        if (!titleMatch) continue;

        const company = titleMatch[1]
          .replace(/<!\[CDATA\[/, "")
          .replace(/\]\]>/, "")
          .split("–")[0]
          .split("-")[0]
          .trim();

        const normalized = company.toLowerCase();
        if (seen.has(normalized) || company.length < 2) continue;
        seen.add(normalized);

        leads.push({
          company,
          source_url: linkMatch?.[1] ?? "https://www.producthunt.com",
          source: "scraper_ai",
          uses_ai: true,
        });
      }
    } else {
      errors.push(`ProductHunt RSS: HTTP ${res.status}`);
    }
  } catch (err) {
    errors.push(`ProductHunt: ${String(err)}`);
  }

  await delay(1000);

  // GitHub trending AI repos from EU
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const res = await fetch(
      `${GH_TRENDING}?q=topic:ai+topic:machine-learning+created:>${since}&sort=stars&order=desc&per_page=20`,
      {
        headers: { Accept: "application/vnd.github.v3+json" },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (res.ok) {
      const data = await res.json();
      for (const repo of data.items ?? []) {
        const owner = repo.owner?.login;
        const location = (repo.owner?.location ?? "").toLowerCase();

        const isEU =
          location.includes("germany") ||
          location.includes("france") ||
          location.includes("netherlands") ||
          location.includes("austria") ||
          location.includes("berlin") ||
          location.includes("paris") ||
          location.includes("amsterdam");

        if (!isEU && location) continue;

        const company = owner ?? repo.name;
        const normalized = company.toLowerCase();
        if (seen.has(normalized)) continue;
        seen.add(normalized);

        leads.push({
          company,
          source_url: repo.html_url,
          source: "scraper_ai",
          uses_ai: true,
        });
      }
    } else {
      errors.push(`GitHub trending: HTTP ${res.status}`);
    }
  } catch (err) {
    errors.push(`GitHub: ${String(err)}`);
  }

  return { leads, errors };
}
