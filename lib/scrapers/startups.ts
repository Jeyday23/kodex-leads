import { type ScraperResult, delay } from "./types";

const EU_STARTUPS_FUNDING =
  "https://www.eu-startups.com/category/funding/feed/";

export async function scrapeStartups(): Promise<ScraperResult> {
  const leads: ScraperResult["leads"] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  try {
    const res = await fetch(EU_STARTUPS_FUNDING, {
      headers: { Accept: "application/xml, text/xml" },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      errors.push(`EUStartups RSS: HTTP ${res.status}`);
      return { leads, errors };
    }

    const xml = await res.text();
    const items = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];

    for (const item of items.slice(0, 30)) {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);

      if (!titleMatch) continue;
      const title = titleMatch[1];

      const dachPattern =
        /\b(berlin|munich|vienna|zurich|hamburg|frankfurt|german|austrian|swiss|dach)\b/i;
      if (!dachPattern.test(title) && !dachPattern.test(item)) continue;

      const companyMatch = title.match(
        /^([\w\s.-]+?)(?:\s+raises|\s+secures|\s+closes|\s+gets|\s+lands)/i
      );
      if (!companyMatch) continue;

      const company = companyMatch[1].trim();
      const normalized = company.toLowerCase();
      if (seen.has(normalized) || company.length < 2) continue;
      seen.add(normalized);

      leads.push({
        company,
        source_url: linkMatch?.[1] ?? "https://www.eu-startups.com",
        source: "scraper_startups",
      });

      await delay(500);
    }
  } catch (err) {
    errors.push(`EUStartups: ${String(err)}`);
  }

  return { leads, errors };
}
