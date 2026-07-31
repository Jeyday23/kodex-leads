export const SEO_EVENT_NAMES = {
  pageView: "seo_page_viewed",
  assessmentStarted: "seo_assessment_started",
  leadCaptured: "seo_lead_captured",
  qualifiedLead: "seo_qualified_lead",
  demoRequested: "seo_demo_requested",
} as const;

export interface LeadAttributionInput {
  landingPage: string;
  contentId?: string | null;
  searchQueryCluster?: string | null;
  firstTouchAt?: string | null;
  lastTouchAt?: string | null;
}

export function normalizeLeadAttribution(input: LeadAttributionInput) {
  const now = new Date().toISOString();
  return {
    landing_page: input.landingPage,
    content_id: input.contentId ?? null,
    search_query_cluster: input.searchQueryCluster ?? null,
    first_touch_at: input.firstTouchAt ?? now,
    last_touch_at: input.lastTouchAt ?? now,
  };
}
