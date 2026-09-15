import { getSeoSupabase } from "./db";
import {
  listDiscoveredLeads as listLocalDiscoveredLeads,
  listLocalLeads,
  type DiscoveredLead,
  type LeadTriggerCategory,
  type StoredLead,
} from "./local-store";
import type { LeadScoreResult } from "./types";

export interface AdminLead {
  id: string;
  email: string;
  companyName: string;
  framework: string;
  landingPage: string;
  score: LeadScoreResult;
  storage: "supabase" | "local";
  createdAt: string;
  routingSummary: string;
}

export async function listAdminLeads(limit = 50): Promise<AdminLead[]> {
  const supabase = getSeoSupabase();
  if (!supabase) {
    const localLeads = await listLocalLeads(limit);
    return localLeads.map(mapLocalLead);
  }

  const { data, error } = await supabase
    .from("leads")
    .select("id,email,company_name,framework,landing_page,lead_score,lead_grade,recommended_action,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((lead) => ({
    id: String(lead.id),
    email: String(lead.email),
    companyName: String(lead.company_name ?? "Unknown company"),
    framework: String(lead.framework ?? "unknown"),
    landingPage: String(lead.landing_page ?? ""),
    score: {
      score: Number(lead.lead_score ?? 0),
      grade: String(lead.lead_grade ?? "low") as LeadScoreResult["grade"],
      recommendedAction: String(lead.recommended_action ?? "nurture") as LeadScoreResult["recommendedAction"],
      reasons: [],
    },
    storage: "supabase",
    createdAt: String(lead.created_at),
    routingSummary: "Stored in Supabase.",
  }));
}

export async function listAdminDiscoveredLeads(limit = 50): Promise<DiscoveredLead[]> {
  const supabase = getSeoSupabase();
  if (!supabase) return listLocalDiscoveredLeads(limit);

  const { data, error } = await supabase
    .from("discovered_leads")
    .select("id,company_name,website,segment,fit_reason,suggested_search_intent,suggested_landing_page,confidence,source,source_url,retrieved_at,contact_email,enrichment_provider,trigger_category,regulatory_framework,fine_amount,decision_maker_name,decision_maker_title,decision_maker_source,outreach_angle,created_at")
    .order("created_at", { ascending: false })
    .limit(limit * 3);

  if (error || !data) return [];

  return data
    .map((row) => mapSupabaseDiscoveredLead(row as Record<string, unknown>))
    .filter((lead): lead is DiscoveredLead => Boolean(lead))
    .filter(visibleDiscoveredLead)
    .slice(0, limit);
}

function mapLocalLead(lead: StoredLead): AdminLead {
  return {
    id: lead.id,
    email: lead.input.email,
    companyName: lead.input.companyName,
    framework: lead.input.framework,
    landingPage: lead.input.landingPage,
    score: lead.score,
    storage: "local",
    createdAt: lead.createdAt,
    routingSummary: lead.routing.map((route) => `${route.channel}: ${route.status}`).join(", "),
  };
}

function mapSupabaseDiscoveredLead(row: Record<string, unknown>): DiscoveredLead | null {
  const companyName = stringValue(row.company_name);
  const segment = stringValue(row.segment);
  const fitReason = stringValue(row.fit_reason);
  const source = stringValue(row.source);
  const sourceUrl = stringValue(row.source_url);
  if (!companyName || !segment || !fitReason || !source || !sourceUrl) return null;

  return {
    id: stringValue(row.id) || crypto.randomUUID(),
    createdAt: stringValue(row.created_at) || new Date().toISOString(),
    companyName,
    website: stringValue(row.website) || "",
    segment,
    fitReason,
    suggestedSearchIntent: stringValue(row.suggested_search_intent),
    suggestedLandingPage: stringValue(row.suggested_landing_page),
    confidence: Number(row.confidence ?? 0),
    source,
    sourceUrl,
    retrievedAt: stringValue(row.retrieved_at) || new Date().toISOString(),
    contactEmail: nullableString(row.contact_email),
    enrichmentProvider: nullableString(row.enrichment_provider),
    triggerCategory: leadTriggerCategory(row.trigger_category),
    regulatoryFramework: nullableString(row.regulatory_framework),
    fineAmount: nullableString(row.fine_amount),
    decisionMakerName: nullableString(row.decision_maker_name),
    decisionMakerTitle: nullableString(row.decision_maker_title),
    decisionMakerSource: nullableString(row.decision_maker_source),
    outreachAngle: nullableString(row.outreach_angle),
  };
}

function visibleDiscoveredLead(lead: DiscoveredLead): boolean {
  if (!lead.sourceUrl) return false;
  if (lead.source === "local-test" || lead.source === "perplexity") return false;
  if (lead.source === "arbeitnow_jobs" && !lead.fitReason.startsWith("Hiring signal")) return false;
  return true;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function nullableString(value: unknown): string | null {
  const text = stringValue(value);
  return text || null;
}

function leadTriggerCategory(value: unknown): LeadTriggerCategory | undefined {
  const text = stringValue(value);
  if (
    text === "enforcement_fine" ||
    text === "regulatory_exposure" ||
    text === "new_company" ||
    text === "compliance_hiring" ||
    text === "funding" ||
    text === "ai_product"
  ) {
    return text;
  }
  return undefined;
}
