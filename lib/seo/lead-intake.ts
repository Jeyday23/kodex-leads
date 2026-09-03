import { z } from "zod";
import { normalizeLeadAttribution, SEO_EVENT_NAMES } from "./attribution";
import { getSeoSupabase } from "./db";
import { scoreLead } from "./lead-scoring";
import { storeLeadLocally } from "./local-store";
import { routeQualifiedLead } from "./routing";
import type { RoutingStatus } from "./local-store";
import type { LeadCaptureInput, LeadScoreResult } from "./types";

/**
 * Canonical wire contract for a full lead capture. Every route that persists a
 * lead validates against this schema (directly, or by mapping a shorter public
 * payload onto it) so the storage layer only ever sees one lead shape.
 */
export const leadCaptureSchema = z.object({
  email: z.email(),
  companyName: z.string().min(2).max(120),
  framework: z.string().min(2).max(80),
  companySize: z.enum(["1-10", "11-50", "51-200", "201-1000", "1000+"]),
  aiUse: z.enum(["none", "evaluating", "internal", "customer-facing", "high-risk"]),
  complianceMaturity: z.enum(["unknown", "starting", "documented", "audited"]),
  urgency: z.enum(["researching", "this-quarter", "this-month", "immediate"]),
  landingPage: z.string().min(1).max(500),
  contentId: z.string().nullable().optional(),
  searchQueryCluster: z.string().max(200).nullable().optional(),
});

export type LeadAttribution = ReturnType<typeof normalizeLeadAttribution>;

export type LeadStorageBackend = "supabase" | "local";

export interface LeadCaptureSuccess {
  ok: true;
  leadId: string;
  storage: LeadStorageBackend;
  score: LeadScoreResult;
  attribution: LeadAttribution;
  routing: RoutingStatus[];
}

export interface LeadCaptureFailure {
  ok: false;
  error: string;
  detail: string;
}

export type LeadCaptureResult = LeadCaptureSuccess | LeadCaptureFailure;

const PERSISTENCE_ERROR = "Lead persistence failed";

function failureDetail(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Scores, attributes, persists and routes a single lead.
 *
 * Uses Supabase when it is configured and falls back to the local JSON store
 * otherwise. Never throws for an expected storage failure: callers get an
 * `ok: false` result and must not report success to the client.
 */
export async function captureLead(input: LeadCaptureInput): Promise<LeadCaptureResult> {
  const score = scoreLead(input);
  const attribution = normalizeLeadAttribution(input);
  const supabase = getSeoSupabase();

  if (supabase) {
    const { data, error } = await supabase
      .from("leads")
      .insert({
        email: input.email,
        company: input.companyName,
        company_name: input.companyName,
        framework: input.framework,
        company_size: input.companySize,
        ai_use: input.aiUse,
        compliance_maturity: input.complianceMaturity,
        urgency: input.urgency,
        lead_score: score.score,
        lead_grade: score.grade,
        recommended_action: score.recommendedAction,
        source: "seo",
        ...attribution,
      })
      .select("id")
      .single();

    if (error) {
      return { ok: false, error: PERSISTENCE_ERROR, detail: error.message };
    }

    const leadId = String(data.id);
    const routing = await routeQualifiedLead({ leadId, lead: input, score });
    await supabase.from("seo_audit_events").insert({
      event_type: score.grade === "sales-ready" ? SEO_EVENT_NAMES.qualifiedLead : SEO_EVENT_NAMES.leadCaptured,
      content_id: input.contentId ?? null,
      payload: {
        lead_id: leadId,
        lead_score: score.score,
        lead_grade: score.grade,
        recommended_action: score.recommendedAction,
        landing_page: input.landingPage,
        routing,
      },
    });

    return { ok: true, leadId, storage: "supabase", score, attribution, routing };
  }

  const localId = crypto.randomUUID();
  const routing = await routeQualifiedLead({ leadId: localId, lead: input, score });

  try {
    const stored = await storeLeadLocally({ input, score, attribution, routing });
    return { ok: true, leadId: stored.id, storage: "local", score, attribution, routing };
  } catch (error) {
    return {
      ok: false,
      error: PERSISTENCE_ERROR,
      detail: failureDetail(error, "Unknown local lead store error."),
    };
  }
}
