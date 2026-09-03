import "server-only";

import { getSeoSupabase } from "./db";
import { extractCompanyFromEnforcementTitle, extractFineAmount } from "./lead-discovery";
import { storeDiscoveredLeadsLocally, type DiscoveredLead } from "./local-store";

const EDPB_ALL_EU_ENFORCEMENT = "https://www.edpb.europa.eu/news/news_en?field_edpb_member_states_target_id=All&news_type=2";

interface Anchor {
  href: string;
  text: string;
}

export async function discoverEuDpaEnforcementLeads(): Promise<{ leads: DiscoveredLead[]; errors: string[] }> {
  try {
    const response = await fetch(EDPB_ALL_EU_ENFORCEMENT, {
      headers: { accept: "text/html", "user-agent": "KodexLeadResearch/2.0" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return { leads: [], errors: [`EDPB all-EU enforcement: HTTP ${response.status}`] };

    const html = await response.text();
    const anchors = parseHtmlAnchors(html);
    const candidates = anchors.filter((anchor) => /(fine|fined|administrative fine|sanction|penalty)/i.test(anchor.text));
    if (anchors.length > 0 && candidates.length === 0) {
      return {
        leads: [],
        errors: [`EDPB all-EU enforcement parsed ${anchors.length} links but found no enforcement/fine titles; page structure or wording may have changed.`],
      };
    }

    const seen = new Set<string>();
    const rows: Omit<DiscoveredLead, "id" | "createdAt">[] = [];
    for (const anchor of candidates) {
      const companyName = extractCompanyFromEnforcementTitle(anchor.text);
      if (!companyName) continue;
      const sourceUrl = absoluteUrl(anchor.href, EDPB_ALL_EU_ENFORCEMENT);
      if (!sourceUrl) continue;
      const dedupeKey = `${normalizeCompany(companyName)}|${sourceUrl.toLowerCase()}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      rows.push({
        companyName,
        website: sourceUrl,
        segment: "EU supervisory-authority enforcement",
        fitReason: `EU-wide EDPB enforcement aggregation reports: ${anchor.text}. Treat this as a verified public trigger for remediation/evidence readiness, not permission to infer any additional violation.`,
        suggestedSearchIntent: "gdpr remediation and compliance evidence after enforcement",
        suggestedLandingPage: "/assess/gdpr",
        confidence: 96,
        source: "edpb_all_eu_enforcement",
        sourceUrl,
        retrievedAt: new Date().toISOString(),
        triggerCategory: "enforcement_fine",
        regulatoryFramework: "GDPR",
        fineAmount: extractFineAmount(anchor.text),
        outreachAngle: "Post-enforcement remediation, audit evidence and controls that can be demonstrated to customers, counsel and regulators.",
      });
      if (rows.length >= 30) break;
    }

    const errors: string[] = [];
    const persistError = await persist(rows);
    if (persistError) errors.push(persistError);
    const leads = await storeDiscoveredLeadsLocally(rows);
    return { leads, errors };
  } catch (error) {
    return { leads: [], errors: [`EDPB all-EU enforcement: ${error instanceof Error ? error.message : String(error)}`] };
  }
}

export function parseHtmlAnchors(html: string): Anchor[] {
  const anchors: Anchor[] = [];
  const lower = html.toLowerCase();
  let cursor = 0;

  while (cursor < html.length) {
    const start = lower.indexOf("<a", cursor);
    if (start < 0) break;
    const tagEnd = findTagEnd(html, start + 2);
    if (tagEnd < 0) break;
    const close = lower.indexOf("</a", tagEnd + 1);
    if (close < 0) {
      cursor = tagEnd + 1;
      continue;
    }
    const closeEnd = findTagEnd(html, close + 3);
    const openTag = html.slice(start + 2, tagEnd);
    const href = readAttribute(openTag, "href");
    const text = decodeEntities(stripTags(html.slice(tagEnd + 1, close))).replace(/\s+/g, " ").trim();
    if (href && text) anchors.push({ href, text });
    cursor = closeEnd >= 0 ? closeEnd + 1 : close + 4;
  }

  return anchors;
}

function findTagEnd(html: string, from: number): number {
  let quote: "\"" | "'" | null = null;
  for (let index = from; index < html.length; index += 1) {
    const char = html[index];
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === "\"" || char === "'") {
      quote = char;
      continue;
    }
    if (char === ">") return index;
  }
  return -1;
}

function readAttribute(tag: string, attributeName: string): string | null {
  let index = 0;
  while (index < tag.length) {
    while (/\s/.test(tag[index] ?? "")) index += 1;
    const nameStart = index;
    while (index < tag.length && /[^\s=]/.test(tag[index])) index += 1;
    const name = tag.slice(nameStart, index).toLowerCase();
    while (/\s/.test(tag[index] ?? "")) index += 1;
    if (tag[index] !== "=") {
      while (index < tag.length && !/\s/.test(tag[index])) index += 1;
      continue;
    }
    index += 1;
    while (/\s/.test(tag[index] ?? "")) index += 1;
    const quote = tag[index] === "\"" || tag[index] === "'" ? tag[index++] : null;
    const valueStart = index;
    if (quote) {
      while (index < tag.length && tag[index] !== quote) index += 1;
    } else {
      while (index < tag.length && !/\s/.test(tag[index])) index += 1;
    }
    const value = tag.slice(valueStart, index);
    if (quote && tag[index] === quote) index += 1;
    if (name === attributeName.toLowerCase()) return decodeEntities(value).trim();
  }
  return null;
}

function stripTags(value: string): string {
  let output = "";
  let inTag = false;
  for (const char of value) {
    if (char === "<") {
      inTag = true;
      output += " ";
    } else if (char === ">") {
      inTag = false;
    } else if (!inTag) {
      output += char;
    }
  }
  return output;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#8211;|&#8212;/g, "-")
    .replace(/&#8217;/g, "'");
}

function absoluteUrl(value: string, base: string): string | null {
  try {
    const url = new URL(value, base);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizeCompany(value: string): string {
  return value.toLowerCase().replace(/\b(gmbh|ug|ag|se|ltd|limited|inc|sa|sarl|bv)\b/g, "").replace(/[^a-z0-9]+/g, "");
}

async function persist(leads: Omit<DiscoveredLead, "id" | "createdAt">[]): Promise<string | null> {
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
  return error ? `Supabase EU DPA enforcement insert: ${error.message}` : null;
}
