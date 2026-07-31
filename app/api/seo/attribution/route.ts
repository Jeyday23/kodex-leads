import { z } from "zod";
import { getSeoSupabase } from "@/lib/seo/db";
import { normalizeLeadAttribution, SEO_EVENT_NAMES } from "@/lib/seo/attribution";

const attributionSchema = z.object({
  landingPage: z.string().min(1).max(500),
  contentId: z.string().uuid().nullable().optional(),
  searchQueryCluster: z.string().max(200).nullable().optional(),
  leadId: z.string().uuid().nullable().optional(),
});

export async function POST(request: Request) {
  const parsed = attributionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid attribution payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const attribution = normalizeLeadAttribution(parsed.data);
  const supabase = getSeoSupabase();

  if (supabase && parsed.data.leadId) {
    await supabase.from("leads").update(attribution).eq("id", parsed.data.leadId);
    await supabase.from("seo_audit_events").insert({
      event_type: SEO_EVENT_NAMES.leadCaptured,
      content_id: parsed.data.contentId ?? null,
      payload: { lead_id: parsed.data.leadId, landing_page: parsed.data.landingPage },
    });
  }

  return Response.json({
    status: "ok",
    event: SEO_EVENT_NAMES.pageView,
    attribution,
    persisted: Boolean(supabase && parsed.data.leadId),
  });
}
