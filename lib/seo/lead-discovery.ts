import "server-only";
import { getSeoSupabase } from "./db";
import { storeAuditEventLocally, storeDiscoveredLeadsLocally, type DiscoveredLead } from "./local-store";

interface ScrapedLead {
  companyName: string;
  website: string;
  segment: string;
  fitReason: string;
  suggestedSearchIntent: string;
  suggestedLandingPage: string;
  confidence: number;
  source: string;
  sourceUrl: string;
  retrievedAt: string;
  contactEmail?: string | null;
  enrichmentProvider?: string | null;
}

export interface LeadDiscoveryResult {
  mode: "live";
  searchedAt: string;
  query: string;
  leads: DiscoveredLead[];
  errors: string[];
  nextActions: string[];
}

const ARBEITNOW_BASE = "https://www.arbeitnow.com/api/job-board-api";
const EU_STARTUPS_FUNDING = "https://www.eu-startups.com/category/funding/feed/";
const PRODUCT_HUNT_AI = "https://www.producthunt.com/categories/artificial-intelligence/rss";
const GITHUB_API = "https://api.github.com";

const complianceJobKeywords = [
  "Data Protection Officer",
  "DPO",
  "Compliance Officer",
  "Datenschutzbeauftragter",
  "GDPR",
  "EU AI Act",
];

const dachSignals = [
  "germany",
  "deutschland",
  "austria",
  "switzerland",
  "berlin",
  "munich",
  "münchen",
  "hamburg",
  "frankfurt",
  "vienna",
  "wien",
  "zurich",
  "zürich",
  "dach",
];

export async function discoverKodexLeads(): Promise<LeadDiscoveryResult> {
  const query = "DACH and EU companies showing compliance buying signals for EU AI Act, GDPR, NIS2, DORA, CRA, ISO 27001 or SOC 2 readiness";
  const searchedAt = new Date().toISOString();
  const results = await Promise.allSettled([scrapeJobBoard(), scrapeFundedStartups(), scrapeAICompanies()]);
  const errors = results.flatMap((result) => result.status === "fulfilled" ? result.value.errors : [String(result.reason)]);
  const leads = dedupeLeads(results.flatMap((result) => result.status === "fulfilled" ? result.value.leads : []))
    .filter((lead) => lead.confidence >= 40)
    .slice(0, 40);

  const enriched = await enrichEmails(leads);
  await persistDiscoveredLeads(enriched);
  const stored = await storeDiscoveredLeadsLocally(enriched);

  await storeAuditEventLocally({
    eventType: errors.length > 0 && stored.length === 0 ? "lead_discovery_failed" : "lead_discovery_completed",
    payload: {
      mode: "live",
      query,
      discovered: stored.length,
      errors,
      sources: [...new Set(stored.map((lead) => lead.source))],
    },
  });

  return {
    mode: "live",
    searchedAt,
    query,
    leads: stored,
    errors,
    nextActions: stored.length > 0
      ? [
          "Review source URLs before outreach.",
          "Prioritize leads with score 40+ and direct compliance or AI signals.",
          "Route outreach only through an approved human or configured CRM workflow.",
        ]
      : [
          "No live leads were stored. Check scraper errors and provider credentials.",
          "Do not use demo rows in operator-facing pipeline.",
        ],
  };
}

async function persistDiscoveredLeads(leads: Omit<DiscoveredLead, "id" | "createdAt">[]): Promise<void> {
  const supabase = getSeoSupabase();
  if (!supabase || leads.length === 0) return;
  await supabase.from("discovered_leads").insert(leads.map((lead) => ({
    company_name: lead.companyName,
    website: lead.website,
    segment: lead.segment,
    fit_reason: lead.fitReason,
    suggested_search_intent: lead.suggestedSearchIntent,
    suggested_landing_page: lead.suggestedLandingPage,
    confidence: lead.confidence,
    source: lead.source,
    source_url: lead.sourceUrl,
    retrieved_at: lead.retrievedAt,
    contact_email: lead.contactEmail,
    enrichment_provider: lead.enrichmentProvider,
  })));
}

async function scrapeJobBoard(): Promise<{ leads: ScrapedLead[]; errors: string[] }> {
  const leads: ScrapedLead[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const keyword of complianceJobKeywords) {
    try {
      const url = `${ARBEITNOW_BASE}?search=${encodeURIComponent(keyword)}&page=1`;
      const response = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(12000) });
      if (!response.ok) {
        errors.push(`Arbeitnow ${keyword}: HTTP ${response.status}`);
        continue;
      }
      const data = await response.json() as { data?: Array<Record<string, unknown>> };
      for (const job of data.data ?? []) {
        const companyName = String(job.company_name ?? "").trim();
        const normalized = companyName.toLowerCase();
        if (!companyName || seen.has(normalized)) continue;
        const title = String(job.title ?? "");
        const description = String(job.description ?? "");
        const matchedSignal = matchedComplianceSignal(`${title} ${description}`);
        if (!matchedSignal) continue;
        const location = String(job.location ?? "");
        if (!isDach(location)) continue;
        seen.add(normalized);
        const sourceUrl = String(job.url ?? "https://www.arbeitnow.com");
        leads.push({
          companyName,
          website: sourceUrl,
          segment: "Compliance hiring signal",
          fitReason: `Hiring signal "${matchedSignal}" in ${title || "a public job post"} from ${location || "DACH/EU"}, which indicates active compliance ownership or gaps.`,
          suggestedSearchIntent: matchedSignal.toLowerCase().includes("ai") ? "eu ai act readiness assessment" : "gdpr compliance readiness assessment",
          suggestedLandingPage: matchedSignal.toLowerCase().includes("ai") ? "/assess/eu-ai-act" : "/assess/gdpr",
          confidence: matchedSignal.toLowerCase().includes("ai") ? 68 : 64,
          source: "arbeitnow_jobs",
          sourceUrl,
          retrievedAt: new Date().toISOString(),
        });
      }
      await delay(450);
    } catch (error) {
      errors.push(`Arbeitnow ${keyword}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { leads, errors };
}

async function scrapeFundedStartups(): Promise<{ leads: ScrapedLead[]; errors: string[] }> {
  const errors: string[] = [];
  try {
    const response = await fetch(EU_STARTUPS_FUNDING, { headers: { accept: "application/xml, text/xml" }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) return { leads: [], errors: [`EU Startups RSS: HTTP ${response.status}`] };
    const xml = await response.text();
    const items = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
    const leads = items.slice(0, 40).flatMap((item): ScrapedLead[] => {
      if (!isDach(item)) return [];
      const title = decodeXml(extractXml(item, "title"));
      const sourceUrl = decodeXml(extractXml(item, "link")) || "https://www.eu-startups.com";
      const companyName = extractFundedCompany(title);
      if (!companyName) return [];
      return [{
        companyName,
        website: sourceUrl,
        segment: "Recently funded startup",
        fitReason: "Recent DACH/EU funding creates budget pressure for investor-grade privacy, AI and security readiness.",
        suggestedSearchIntent: "startup compliance readiness after funding",
        suggestedLandingPage: "/assess/gdpr",
        confidence: 58,
        source: "eu_startups_funding",
        sourceUrl,
        retrievedAt: new Date().toISOString(),
      }];
    });
    return { leads, errors };
  } catch (error) {
    return { leads: [], errors: [`EU Startups RSS: ${error instanceof Error ? error.message : String(error)}`] };
  }
}

async function scrapeAICompanies(): Promise<{ leads: ScrapedLead[]; errors: string[] }> {
  const errors: string[] = [];
  const leads: ScrapedLead[] = [];
  try {
    const response = await fetch(PRODUCT_HUNT_AI, { headers: { accept: "application/xml, text/xml" }, signal: AbortSignal.timeout(15000) });
    if (response.ok) {
      const xml = await response.text();
      const items = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
      for (const item of items.slice(0, 20)) {
        const title = decodeXml(extractXml(item, "title"));
        const companyName = title.split("–")[0].split("-")[0].trim();
        if (companyName.length < 2) continue;
        const sourceUrl = decodeXml(extractXml(item, "link")) || "https://www.producthunt.com";
        leads.push({
          companyName,
          website: sourceUrl,
          segment: "AI product signal",
          fitReason: "Public AI product launch indicates likely AI governance, privacy and product-risk questions.",
          suggestedSearchIntent: "eu ai act assessment for ai product",
          suggestedLandingPage: "/assess/eu-ai-act",
          confidence: 48,
          source: "producthunt_ai",
          sourceUrl,
          retrievedAt: new Date().toISOString(),
        });
      }
    } else {
      errors.push(`Product Hunt AI RSS: HTTP ${response.status}`);
    }
  } catch (error) {
    errors.push(`Product Hunt AI RSS: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const response = await fetch(`${GITHUB_API}/search/repositories?q=topic:ai+topic:machine-learning+created:>${since}&sort=stars&order=desc&per_page=30`, {
      headers: { accept: "application/vnd.github.v3+json" },
      signal: AbortSignal.timeout(15000),
    });
    if (response.ok) {
      const data = await response.json() as { items?: Array<Record<string, unknown>> };
      for (const repo of data.items ?? []) {
        const owner = repo.owner as Record<string, unknown> | undefined;
        const login = String(owner?.login ?? "");
        const repoUrl = String(repo.html_url ?? "");
        if (!login) continue;
        const profile = await fetchGitHubProfile(login);
        if (!profile || !isDach(String(profile.location ?? ""))) continue;
        const companyName = String(profile.company ?? profile.name ?? login).replace(/^@/, "").trim();
        if (!companyName) continue;
        leads.push({
          companyName,
          website: String(profile.blog ?? repoUrl),
          segment: "EU AI engineering signal",
          fitReason: `EU-based AI engineering activity in ${profile.location} indicates potential AI governance and product-risk exposure.`,
          suggestedSearchIntent: "eu ai act readiness for ai startup",
          suggestedLandingPage: "/assess/eu-ai-act",
          confidence: 52,
          source: "github_ai",
          sourceUrl: repoUrl,
          retrievedAt: new Date().toISOString(),
        });
        await delay(250);
      }
    } else {
      errors.push(`GitHub AI search: HTTP ${response.status}`);
    }
  } catch (error) {
    errors.push(`GitHub AI search: ${error instanceof Error ? error.message : String(error)}`);
  }

  return { leads, errors };
}

async function enrichEmails(leads: ScrapedLead[]): Promise<Omit<DiscoveredLead, "id" | "createdAt">[]> {
  const enriched: Omit<DiscoveredLead, "id" | "createdAt">[] = [];
  for (const lead of leads) {
    const domain = extractDomain(lead.website);
    const contact = domain ? await enrichEmail(domain) : null;
    enriched.push({
      ...lead,
      contactEmail: contact?.email ?? null,
      enrichmentProvider: contact?.provider ?? null,
    });
    await delay(300);
  }
  return enriched;
}

async function enrichEmail(domain: string): Promise<{ email: string; provider: string } | null> {
  const hunterKey = process.env.HUNTER_API_KEY;
  if (hunterKey) {
    try {
      const response = await fetch(`https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${hunterKey}&limit=1`, {
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok) {
        const data = await response.json();
        const email = String(data.data?.emails?.[0]?.value ?? "");
        if (email) return { email, provider: "hunter" };
      }
    } catch {
      // Enrichment is optional; source-verified company discovery still succeeds without it.
    }
  }
  return null;
}

function dedupeLeads(leads: ScrapedLead[]): ScrapedLead[] {
  const seen = new Set<string>();
  return leads.filter((lead) => {
    const key = lead.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchGitHubProfile(login: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(`${GITHUB_API}/users/${login}`, { headers: { accept: "application/vnd.github.v3+json" }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    return response.json() as Promise<Record<string, unknown>>;
  } catch {
    return null;
  }
}

function isDach(value: string): boolean {
  const normalized = value.toLowerCase();
  return dachSignals.some((signal) => normalized.includes(signal));
}

function matchedComplianceSignal(value: string): string | null {
  const normalized = value.toLowerCase();
  const signals = [
    "data protection officer",
    "datenschutzbeauftragter",
    "compliance officer",
    "gdpr",
    "dsgvo",
    "eu ai act",
    "ai governance",
    "iso 27001",
    "soc 2",
    "nis2",
    "dora",
  ];
  return signals.find((signal) => normalized.includes(signal)) ?? null;
}

function extractXml(item: string, tag: string): string {
  const cdata = item.match(new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`));
  if (cdata?.[1]) return cdata[1];
  const plain = item.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return plain?.[1] ?? "";
}

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, "-")
    .replace(/&#8212;/g, "-")
    .trim();
}

function extractFundedCompany(title: string): string | null {
  const match = title.match(/^(.+?)(?:\s+raises|\s+secures|\s+closes|\s+gets|\s+lands|\s+banks|\s+snaps up)/i);
  const company = match?.[1]?.replace(/^Exclusive:\s*/i, "").trim();
  return company && company.length > 1 ? company : null;
}

function extractDomain(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
    const host = url.hostname.replace(/^www\./, "");
    if (host.includes("arbeitnow.com") || host.includes("eu-startups.com") || host.includes("producthunt.com") || host.includes("github.com")) return null;
    return host;
  } catch {
    return null;
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
