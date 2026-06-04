import { type ScraperResult, delay } from "./types";

const PH_RSS = "https://www.producthunt.com/categories/artificial-intelligence/rss";
const GH_API = "https://api.github.com";

const EU_LOCATIONS = [
  "germany", "deutschland", "france", "netherlands", "austria",
  "berlin", "munich", "münchen", "hamburg", "frankfurt", "cologne", "köln",
  "paris", "amsterdam", "vienna", "wien", "zurich", "zürich", "switzerland",
  "brussels", "copenhagen", "stockholm", "helsinki", "oslo", "dublin",
  "prague", "warsaw", "barcelona", "madrid", "milan", "lisbon",
];

function isEULocation(location: string): boolean {
  const lower = location.toLowerCase();
  return EU_LOCATIONS.some((term) => lower.includes(term));
}

async function fetchGitHubUser(login: string): Promise<Record<string, string> | null> {
  try {
    const res = await fetch(`${GH_API}/users/${login}`, {
      headers: { Accept: "application/vnd.github.v3+json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

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

  // GitHub: EU-based organizations working on AI
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const res = await fetch(
      `${GH_API}/search/repositories?q=topic:ai+topic:machine-learning+created:>${since}&sort=stars&order=desc&per_page=30`,
      {
        headers: { Accept: "application/vnd.github.v3+json" },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (res.ok) {
      const data = await res.json();
      const checkedOwners = new Set<string>();

      for (const repo of data.items ?? []) {
        const login = repo.owner?.login;
        if (!login || checkedOwners.has(login) || seen.has(login.toLowerCase())) continue;
        checkedOwners.add(login);

        await delay(300);
        const profile = await fetchGitHubUser(login);
        if (!profile) continue;

        const location = profile.location ?? "";
        if (!location || !isEULocation(location)) continue;

        const company = profile.company?.replace(/^@/, "") || profile.name || login;
        const normalized = company.toLowerCase();
        if (seen.has(normalized)) continue;
        seen.add(normalized);

        leads.push({
          company,
          source_url: profile.blog || repo.html_url,
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
