import { getSeoSupabase } from "./db";
import {
  storeAuditEventLocally,
  storeDiscoveredLeadsLocally,
  type DiscoveredLead,
  type LeadTriggerCategory,
} from "./local-store";

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
  triggerCategory?: LeadTriggerCategory;
  regulatoryFramework?: string | null;
  fineAmount?: string | null;
  decisionMakerName?: string | null;
  decisionMakerTitle?: string | null;
  decisionMakerSource?: string | null;
  outreachAngle?: string | null;
}

interface EnrichedContact {
  email: string;
  provider: string;
  name?: string | null;
  title?: string | null;
}

interface ApolloDecisionMaker {
  name: string | null;
  title: string | null;
  source: string;
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
const EDPB_NEWS = "https://www.edpb.europa.eu/news/news_en?field_edpb_member_states_target_id=All&news_type=2";
const NORTHDATA_POWER = "https://www.northdata.com/_api/search/v1/power";
const APOLLO_PEOPLE_SEARCH = "https://api.apollo.io/api/v1/mixed_people/api_search";

const complianceJobKeywords = [
  "Data Protection Officer",
  "DPO",
  "Compliance Officer",
  "Datenschutzbeauftragter",
  "GDPR",
  "EU AI Act",
  "NIS2",
  "DORA",
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

const decisionMakerPriority = [
  ["data protection officer", 110],
  ["datenschutzbeauftrag", 108],
  ["head of compliance", 105],
  ["compliance officer", 100],
  ["compliance", 96],
  ["privacy", 94],
  ["general counsel", 90],
  ["legal", 86],
  ["chief information security", 84],
  ["ciso", 84],
  ["security", 78],
  ["risk", 76],
  ["chief technology", 70],
  ["cto", 70],
  ["geschäftsführer", 66],
  ["managing director", 66],
  ["founder", 62],
  ["chief executive", 60],
  ["ceo", 60],
] as const;

export async function discoverKodexLeads(): Promise<LeadDiscoveryResult> {
  const query = "EU companies with evidence-backed fines, regulatory exposure signals, new GmbH/UG formation, compliance hiring, funding or AI-product signals";
  const searchedAt = new Date().toISOString();
  const results = await Promise.allSettled([
    scrapeRegulatoryEnforcement(),
    scrapeNewGermanCompanies(),
    scrapeJobBoard(),
    scrapeFundedStartups(),
    scrapeAICompanies(),
  ]);
  const errors = results.flatMap((result) => result.status === "fulfilled" ? result.value.errors : [String(result.reason)]);
  const leads = dedupeLeads(results.flatMap((result) => result.status === "fulfilled" ? result.value.leads : []))
    .filter((lead) => lead.confidence >= 40)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 60);

  const enriched = await enrichDecisionMakers(leads);
  const persistError = await persistDiscoveredLeads(enriched);
  if (persistError) errors.push(persistError);
  const stored = await storeDiscoveredLeadsLocally(enriched);

  await storeAuditEventLocally({
    eventType: errors.length > 0 && stored.length === 0 ? "lead_discovery_failed" : "lead_discovery_completed",
    payload: {
      mode: "live",
      query,
      discovered: stored.length,
      errors,
      sources: [...new Set(stored.map((lead) => lead.source))],
      triggerCategories: [...new Set(stored.map((lead) => lead.triggerCategory).filter(Boolean))],
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
          "Prioritize evidence-backed enforcement leads first, then high-confidence exposure and new-company signals.",
          "Review the source URL before outreach; regulatory-exposure signals are not findings of noncompliance.",
          "Contact the identified compliance, privacy, legal, security or executive buyer through an approved outreach workflow.",
        ]
      : [
          "No live leads were stored. Check source errors and enrichment credentials.",
          "NORTHDATA_API_KEY is optional but required for automated new GmbH/UG formation discovery.",
        ],
  };
}

async function persistDiscoveredLeads(leads: Omit<DiscoveredLead, "id" | "createdAt">[]): Promise<string | null> {
  const supabase = getSeoSupabase();
  if (!supabase || leads.length === 0) return null;
  const { error } = await supabase.from("discovered_leads").insert(leads.map((lead) => ({
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
    trigger_category: lead.triggerCategory,
    regulatory_framework: lead.regulatoryFramework,
    fine_amount: lead.fineAmount,
    decision_maker_name: lead.decisionMakerName,
    decision_maker_title: lead.decisionMakerTitle,
    decision_maker_source: lead.decisionMakerSource,
    outreach_angle: lead.outreachAngle,
  })));
  return error ? `Supabase discovered_leads insert: ${error.message}` : null;
}

async function scrapeRegulatoryEnforcement(): Promise<{ leads: ScrapedLead[]; errors: string[] }> {
  try {
    const response = await fetch(EDPB_NEWS, {
      headers: { accept: "text/html", "user-agent": "KodexLeadResearch/1.0" },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return { leads: [], errors: [`EDPB enforcement: HTTP ${response.status}`] };
    const html = await response.text();
    const anchors = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
    const leads: ScrapedLead[] = [];
    const seen = new Set<string>();

    for (const match of anchors) {
      const title = stripHtml(match[2]).replace(/\s+/g, " ").trim();
      if (!/(fine|fined|administrative fine|sanction)/i.test(title)) continue;
      const companyName = extractCompanyFromEnforcementTitle(title);
      if (!companyName || companyName.length < 2) continue;
      const key = normalizeCompany(companyName);
      if (seen.has(key)) continue;
      seen.add(key);
      const href = match[1].startsWith("http") ? match[1] : new URL(match[1], EDPB_NEWS).toString();
      leads.push({
        companyName,
        website: href,
        segment: "Recent regulatory enforcement",
        fitReason: `Evidence-backed GDPR enforcement signal: ${title}. Kodex should position remediation, evidence readiness and repeat-issue prevention rather than imply any additional violation.`,
        suggestedSearchIntent: "gdpr remediation and compliance evidence after enforcement",
        suggestedLandingPage: "/assess/gdpr",
        confidence: 94,
        source: "edpb_enforcement",
        sourceUrl: href,
        retrievedAt: new Date().toISOString(),
        triggerCategory: "enforcement_fine",
        regulatoryFramework: "GDPR",
        fineAmount: extractFineAmount(title),
        outreachAngle: "Post-enforcement remediation, audit evidence and controls that can be demonstrated to customers, counsel and regulators.",
      });
      if (leads.length >= 20) break;
    }
    return { leads, errors: [] };
  } catch (error) {
    return { leads: [], errors: [`EDPB enforcement: ${error instanceof Error ? error.message : String(error)}`] };
  }
}

async function scrapeNewGermanCompanies(): Promise<{ leads: ScrapedLead[]; errors: string[] }> {
  const key = process.env.NORTHDATA_API_KEY;
  if (!key) return { leads: [], errors: ["North Data new-company discovery disabled: NORTHDATA_API_KEY not configured."] };

  const minDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const params = new URLSearchParams({
    countries: "DE",
    status: "active",
    legalForm: "llc",
    eventType: "NewCompany",
    minDate,
    keepAlive: "false",
    representatives: "true",
    extras: "true",
    censor: "true",
    api_key: key,
  });

  try {
    const response = await fetch(`${NORTHDATA_POWER}?${params.toString()}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(18000),
    });
    if (!response.ok) return { leads: [], errors: [`North Data new companies: HTTP ${response.status}`] };
    const data = await response.json() as Record<string, unknown>;
    const rows = findCompanyArray(data);
    const leads = rows.slice(0, 30).flatMap((row): ScrapedLead[] => {
      if (row.blocked === true) return [];
      const nameNode = asRecord(row.name);
      const companyName = String(nameNode?.name ?? row.name ?? "").trim();
      if (!companyName || !/(gmbh|ug\b|unternehmergesellschaft)/i.test(companyName)) return [];
      const address = asRecord(row.address);
      const city = String(address?.city ?? "Germany");
      const register = asRecord(row.register);
      const registerId = String(register?.id ?? "");
      const companyWebsite = extractNorthDataWebsite(row) ?? "";
      const representative = extractNorthDataRepresentative(row);
      const sourceUrl = `https://www.northdata.com/${encodeURIComponent(companyName)},${encodeURIComponent(city)}`;
      return [{
        companyName,
        website: companyWebsite || sourceUrl,
        segment: "New German company formation",
        fitReason: `New ${companyName.toLowerCase().includes("ug") ? "UG" : "GmbH"} formation signal in ${city}${registerId ? ` (${registerId})` : ""}. This is an early-stage compliance-foundation opportunity, not evidence of noncompliance.`,
        suggestedSearchIntent: "compliance setup for new german company",
        suggestedLandingPage: "/assess/gdpr",
        confidence: 72,
        source: "northdata_new_company",
        sourceUrl,
        retrievedAt: new Date().toISOString(),
        triggerCategory: "new_company",
        regulatoryFramework: "GDPR / AI Act / security readiness",
        decisionMakerName: representative?.name ?? null,
        decisionMakerTitle: representative?.title ?? null,
        decisionMakerSource: representative ? "North Data public company representative" : null,
        outreachAngle: "Build privacy, AI and security evidence correctly from the beginning before enterprise procurement or fundraising creates pressure.",
      }];
    });
    return { leads, errors: [] };
  } catch (error) {
    return { leads: [], errors: [`North Data new companies: ${error instanceof Error ? error.message : String(error)}`] };
  }
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
        const framework = inferFramework(`${matchedSignal} ${title} ${description}`);
        leads.push({
          companyName,
          website: sourceUrl,
          segment: "Compliance hiring signal",
          fitReason: `Hiring signal "${matchedSignal}" in ${title || "a public job post"} from ${location || "DACH/EU"}. This indicates active compliance ownership or readiness work; it is not proof of a violation or pending fine.`,
          suggestedSearchIntent: framework === "EU AI Act" ? "eu ai act readiness assessment" : "compliance readiness assessment",
          suggestedLandingPage: framework === "EU AI Act" ? "/assess/eu-ai-act" : "/assess/gdpr",
          confidence: framework === "EU AI Act" ? 72 : 66,
          source: "arbeitnow_jobs",
          sourceUrl,
          retrievedAt: new Date().toISOString(),
          triggerCategory: "compliance_hiring",
          regulatoryFramework: framework,
          outreachAngle: "Help the incoming compliance owner establish defensible evidence, controls and remediation workflows faster.",
        });
      }
      await delay(350);
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
        fitReason: "Recent DACH/EU funding is a buying signal for investor- and enterprise-grade privacy, AI and security readiness. It is not evidence of regulatory noncompliance.",
        suggestedSearchIntent: "startup compliance readiness after funding",
        suggestedLandingPage: "/assess/gdpr",
        confidence: 60,
        source: "eu_startups_funding",
        sourceUrl,
        retrievedAt: new Date().toISOString(),
        triggerCategory: "funding",
        regulatoryFramework: inferFramework(title),
        outreachAngle: "Turn new funding into enterprise-ready compliance evidence before procurement and diligence become blockers.",
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
          segment: "AI product regulatory exposure signal",
          fitReason: "Public AI product launch indicates likely EU AI Act, privacy and product-governance obligations depending on role and use case. This is a readiness signal, not a claim that the company is noncompliant or will be fined.",
          suggestedSearchIntent: "eu ai act assessment for ai product",
          suggestedLandingPage: "/assess/eu-ai-act",
          confidence: 54,
          source: "producthunt_ai",
          sourceUrl,
          retrievedAt: new Date().toISOString(),
          triggerCategory: "regulatory_exposure",
          regulatoryFramework: "EU AI Act",
          outreachAngle: "Map AI Act role, transparency duties, evidence and human-review controls before enforcement or enterprise buyer questions arise.",
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
        const owner = asRecord(repo.owner);
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
          segment: "EU AI engineering regulatory exposure signal",
          fitReason: `EU-based AI engineering activity in ${profile.location} indicates potential AI governance and product-risk obligations depending on deployment. This is not evidence of a violation.`,
          suggestedSearchIntent: "eu ai act readiness for ai startup",
          suggestedLandingPage: "/assess/eu-ai-act",
          confidence: 56,
          source: "github_ai",
          sourceUrl: repoUrl,
          retrievedAt: new Date().toISOString(),
          triggerCategory: "regulatory_exposure",
          regulatoryFramework: "EU AI Act",
          outreachAngle: "Translate active AI development into an auditable AI governance and Article 50 readiness path.",
        });
        await delay(220);
      }
    } else {
      errors.push(`GitHub AI search: HTTP ${response.status}`);
    }
  } catch (error) {
    errors.push(`GitHub AI search: ${error instanceof Error ? error.message : String(error)}`);
  }

  return { leads, errors };
}

async function enrichDecisionMakers(leads: ScrapedLead[]): Promise<Omit<DiscoveredLead, "id" | "createdAt">[]> {
  const enriched: Omit<DiscoveredLead, "id" | "createdAt">[] = [];
  const maxEnrichments = Math.max(0, Math.min(Number(process.env.LEAD_ENRICHMENT_MAX_PER_RUN ?? 12) || 12, 30));

  for (const [index, lead] of leads.entries()) {
    const domain = extractDomain(lead.website);
    const apollo = domain ? await searchApolloDecisionMaker(domain) : null;
    const contact = domain && index < maxEnrichments ? await enrichContact(domain, apollo?.name ?? undefined) : null;
    enriched.push({
      ...lead,
      contactEmail: contact?.email ?? lead.contactEmail ?? null,
      enrichmentProvider: contact?.provider ?? lead.enrichmentProvider ?? (apollo ? "apollo-search" : null),
      decisionMakerName: apollo?.name ?? contact?.name ?? lead.decisionMakerName ?? null,
      decisionMakerTitle: apollo?.title ?? contact?.title ?? lead.decisionMakerTitle ?? fallbackBuyerTitle(lead.triggerCategory),
      decisionMakerSource: apollo?.source ?? (contact ? "Hunter public professional contact enrichment" : lead.decisionMakerSource ?? null),
    });
    await delay(180);
  }
  return enriched;
}

async function searchApolloDecisionMaker(domain: string): Promise<ApolloDecisionMaker | null> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) return null;
  const params = new URLSearchParams({
    include_similar_titles: "true",
    per_page: "10",
    page: "1",
  });
  for (const title of ["data protection officer", "privacy", "compliance", "general counsel", "legal", "security", "risk", "chief technology officer", "managing director", "founder"]) {
    params.append("person_titles[]", title);
  }
  for (const seniority of ["manager", "director", "vp", "c_suite", "head"]) {
    params.append("person_seniorities[]", seniority);
  }
  params.append("q_organization_domains_list[]", domain);

  try {
    const response = await fetch(`${APOLLO_PEOPLE_SEARCH}?${params.toString()}`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return null;
    const data = await response.json() as { people?: Array<Record<string, unknown>> };
    const ranked = (data.people ?? [])
      .map((person) => {
        const title = String(person.title ?? "").trim();
        const rawName = String(person.name ?? [person.first_name, person.last_name].filter(Boolean).join(" ") ?? "").trim();
        return { title, name: cleanApolloName(rawName), score: scoreDecisionMaker(title) };
      })
      .sort((a, b) => b.score - a.score);
    const best = ranked[0];
    if (!best) return null;
    return { name: best.name, title: best.title || null, source: "Apollo People API Search" };
  } catch {
    return null;
  }
}

async function enrichContact(domain: string, preferredName?: string): Promise<EnrichedContact | null> {
  const hunterKey = process.env.HUNTER_API_KEY;
  if (!hunterKey) return null;

  if (preferredName) {
    try {
      const params = new URLSearchParams({ domain, full_name: preferredName, api_key: hunterKey });
      const response = await fetch(`https://api.hunter.io/v2/email-finder?${params.toString()}`, { signal: AbortSignal.timeout(10000) });
      if (response.ok) {
        const payload = await response.json() as { data?: Record<string, unknown> };
        const data = payload.data;
        const email = String(data?.email ?? "").trim();
        if (email) {
          return {
            email,
            provider: "hunter-email-finder",
            name: [data?.first_name, data?.last_name].map((value) => String(value ?? "").trim()).filter(Boolean).join(" ") || preferredName,
            title: String(data?.position ?? "").trim() || null,
          };
        }
      }
    } catch {
      // Fall back to domain search below.
    }
  }

  try {
    const response = await fetch(`https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${hunterKey}&limit=10`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    const data = await response.json() as { data?: { emails?: Array<Record<string, unknown>> } };
    const contacts = data.data?.emails ?? [];
    const ranked = contacts
      .map((item) => {
        const title = String(item.position ?? item.department ?? "").trim();
        const name = [item.first_name, item.last_name].map((value) => String(value ?? "").trim()).filter(Boolean).join(" ");
        return {
          email: String(item.value ?? ""),
          title,
          name,
          score: scoreDecisionMaker(title) + Number(item.confidence ?? 0) / 10,
        };
      })
      .filter((item) => item.email.includes("@"))
      .sort((a, b) => b.score - a.score);
    const best = ranked[0];
    return best ? { email: best.email, provider: "hunter-domain-search", name: best.name || null, title: best.title || null } : null;
  } catch {
    return null;
  }
}

export function scoreDecisionMaker(title: string): number {
  const normalized = title.toLowerCase();
  return decisionMakerPriority.reduce((best, [needle, score]) => normalized.includes(needle) ? Math.max(best, score) : best, 20);
}

export function extractCompanyFromEnforcementTitle(title: string): string | null {
  const cleaned = title.replace(/\s+/g, " ").trim();
  const patterns = [
    /(?:has\s+)?fined\s+(.+?)\s+(?:for|over|after|€|EUR|\d)/i,
    /fine(?:s|d)?\s+(?:on\s+)?(.+?)\s+(?:for|over|after|€|EUR|\d)/i,
    /(?:fine|fines|sanction|sanctions)\s+(?:of\s+[^ ]+\s+){0,8}imposed\s+on\s+(.+?)(?:\.|,|$)/i,
    /administrative\s+fine\s+(?:on|against)\s+(.+?)(?:\.|,|$)/i,
  ];
  for (const pattern of patterns) {
    const candidate = cleaned.match(pattern)?.[1]?.trim();
    if (!candidate) continue;
    const normalized = candidate
      .replace(/^(?:the\s+)?(?:company|organisation|organization)\s+/i, "")
      .replace(/\s+(?:company|group)$/i, "")
      .trim();
    if (normalized.length >= 2 && normalized.length <= 100 && !/^(a|an|the)\s/i.test(normalized)) return normalized;
  }
  return null;
}

export function extractFineAmount(title: string): string | null {
  const match = title.match(/(?:€\s?[\d., ]+(?:\s?(?:million|billion|m|bn))?|[\d., ]+\s?(?:EUR|€))/i);
  return match?.[0]?.replace(/\s+/g, " ").trim() ?? null;
}

function fallbackBuyerTitle(category?: LeadTriggerCategory): string {
  if (category === "new_company") return "Founder / Managing Director / Compliance owner";
  if (category === "enforcement_fine") return "DPO / Head of Compliance / General Counsel";
  return "DPO / Compliance / Legal / Security decision maker";
}

function cleanApolloName(value: string): string | null {
  const name = value.replace(/\s+/g, " ").trim();
  if (!name || name.includes("*") || name.split(" ").length < 2) return null;
  return name;
}

function scoreDecisionMakerName(value: unknown): string {
  if (typeof value === "string") return value.trim();
  const record = asRecord(value);
  if (!record) return "";
  const direct = [record.firstName, record.lastName].map((part) => String(part ?? "").trim()).filter(Boolean).join(" ");
  return direct || String(record.name ?? "").trim();
}

function extractNorthDataRepresentative(row: Record<string, unknown>): { name: string; title: string } | null {
  const pools = [row.representatives, row.relatedPersons, row.relations];
  const candidates: Array<{ name: string; title: string; score: number }> = [];
  for (const pool of pools) {
    if (!Array.isArray(pool)) continue;
    for (const item of pool) {
      const record = asRecord(item);
      if (!record) continue;
      const roleNode = asRecord(record.role);
      const roles = Array.isArray(record.roles) ? record.roles.map(asRecord).filter(Boolean) as Array<Record<string, unknown>> : [];
      const title = String(record.roleName ?? roleNode?.name ?? roles[0]?.name ?? roles[0]?.type ?? record.type ?? "Managing Director");
      const name = scoreDecisionMakerName(record.person ?? record.name ?? record);
      if (!name) continue;
      candidates.push({ name, title, score: scoreDecisionMaker(title) });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] ?? null;
}

function extractNorthDataWebsite(row: Record<string, unknown>): string | null {
  const extras = asRecord(row.extras);
  const candidates = [extras?.url, extras?.website, row.url, row.website];
  for (const value of candidates) {
    const text = String(value ?? "").trim();
    if (text.startsWith("http://") || text.startsWith("https://")) return text;
  }
  return null;
}

function findCompanyArray(data: Record<string, unknown>): Array<Record<string, unknown>> {
  for (const key of ["results", "companies", "items", "data"]) {
    const value = data[key];
    if (Array.isArray(value)) return value.map(asRecord).filter(Boolean) as Array<Record<string, unknown>>;
  }
  return [];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function dedupeLeads(leads: ScrapedLead[]): ScrapedLead[] {
  const selected = new Map<string, ScrapedLead>();
  for (const lead of leads) {
    const key = normalizeCompany(lead.companyName);
    if (!key) continue;
    const current = selected.get(key);
    if (!current || lead.confidence > current.confidence || lead.triggerCategory === "enforcement_fine") selected.set(key, lead);
  }
  return [...selected.values()];
}

function normalizeCompany(value: string): string {
  return value.toLowerCase().replace(/\b(gmbh|ug|ag|se|ltd|limited|inc|sa|sarl|bv)\b/g, "").replace(/[^a-z0-9]+/g, "");
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
    "cyber resilience act",
  ];
  return signals.find((signal) => normalized.includes(signal)) ?? null;
}

function inferFramework(value: string): string {
  const normalized = value.toLowerCase();
  if (normalized.includes("dora") || /fintech|bank|financial|insurance/.test(normalized)) return "DORA";
  if (normalized.includes("nis2")) return "NIS2";
  if (normalized.includes("cyber resilience") || normalized.includes("cra")) return "CRA";
  if (normalized.includes("ai") || normalized.includes("machine learning")) return "EU AI Act";
  return "GDPR";
}

function stripHtml(value: string): string {
  return decodeXml(value.replace(/<[^>]+>/g, " "));
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
    .replace(/&#39;|&#8217;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#8211;|&#8212;/g, "-")
    .replace(/&nbsp;/g, " ")
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
    if (["arbeitnow.com", "eu-startups.com", "producthunt.com", "github.com", "edpb.europa.eu", "northdata.com"].some((blocked) => host.includes(blocked))) return null;
    return host;
  } catch {
    return null;
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
