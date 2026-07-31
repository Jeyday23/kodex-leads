import { z } from "zod";
import { normalizeLeadAttribution, SEO_EVENT_NAMES } from "@/lib/seo/attribution";
import { getSeoSupabase } from "@/lib/seo/db";
import { scoreLead } from "@/lib/seo/lead-scoring";
import { storeLeadLocally } from "@/lib/seo/local-store";
import { routeQualifiedLead } from "@/lib/seo/routing";
import type { RoutingStatus } from "@/lib/seo/local-store";

const leadCaptureSchema = z.object({
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

export async function POST(request: Request) {
  const parsed = leadCaptureSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid lead payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const score = scoreLead(parsed.data);
  const attribution = normalizeLeadAttribution(parsed.data);
  const supabase = getSeoSupabase();
  let leadId: string;
  let storage: "supabase" | "local";
  let routing: RoutingStatus[];

  if (supabase) {
    const { data, error } = await supabase
      .from("leads")
      .insert({
        email: parsed.data.email,
        company_name: parsed.data.companyName,
        framework: parsed.data.framework,
        company_size: parsed.data.companySize,
        ai_use: parsed.data.aiUse,
        compliance_maturity: parsed.data.complianceMaturity,
        urgency: parsed.data.urgency,
        lead_score: score.score,
        lead_grade: score.grade,
        recommended_action: score.recommendedAction,
        source: "seo",
        ...attribution,
      })
      .select("id")
      .single();

    if (error) {
      return Response.json({ error: "Lead persistence failed", detail: error.message }, { status: 500 });
    }

    leadId = String(data.id);
    storage = "supabase";
    routing = await routeQualifiedLead({ leadId, lead: parsed.data, score });
    await supabase.from("seo_audit_events").insert({
      event_type: score.grade === "sales-ready" ? SEO_EVENT_NAMES.qualifiedLead : SEO_EVENT_NAMES.leadCaptured,
      content_id: parsed.data.contentId ?? null,
      payload: {
        lead_id: leadId,
        lead_score: score.score,
        lead_grade: score.grade,
        recommended_action: score.recommendedAction,
        landing_page: parsed.data.landingPage,
        routing,
      },
    });
  } else {
    const localId = crypto.randomUUID();
    routing = await routeQualifiedLead({ leadId: localId, lead: parsed.data, score });
    const stored = await storeLeadLocally({
      input: parsed.data,
      score,
      attribution,
      routing,
    });
    leadId = stored.id;
    storage = "local";
  }

  return Response.json({
    status: "ok",
    persisted: true,
    storage,
    leadId,
    score,
    attribution,
    routing,
  });
}
