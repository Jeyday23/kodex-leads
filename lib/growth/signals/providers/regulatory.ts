// WS3 regulatory bridge: turns rows already discovered by the existing
// lead-discovery pipeline (public.discovered_leads, migration 018) into
// signal events, so they show up alongside hiring/stack/manual signals
// instead of living only in the separate outreach approval queue.
//
// Deliberately NOT "server-only": scripts/run-growth-signals.ts imports this
// module directly under plain tsx.

import { getSeoSupabase } from "@/lib/seo/db";
import type { SignalConfig } from "@/lib/growth/context";
import type { SignalEventDraft, SignalProvider, SignalProviderStatus } from "../types";

interface DiscoveredLeadRow {
  id: string;
  company_name: string;
  website: string | null;
  fit_reason: string;
  source: string;
  source_url: string;
  confidence: number;
  trigger_category: string | null;
  regulatory_framework: string | null;
  decision_maker_name: string | null;
  decision_maker_title: string | null;
  retrieved_at: string;
}

function domainFromWebsite(website: string | null): string | undefined {
  if (!website) return undefined;
  try {
    const url = website.startsWith("http") ? website : `https://${website}`;
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

/**
 * Reads recent `discovered_leads` rows and maps them into signal events.
 * `dedupeKey` is derived from the row id, so re-running this bridge against
 * the same underlying lead never creates a duplicate event.
 */
export async function bridgeRegulatoryLeadsToSignals(limit = 50): Promise<SignalEventDraft[]> {
  const supabase = getSeoSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("discovered_leads")
    .select(
      "id, company_name, website, fit_reason, source, source_url, confidence, trigger_category, regulatory_framework, decision_maker_name, decision_maker_title, retrieved_at",
    )
    .order("retrieved_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return (data as DiscoveredLeadRow[]).map((row) => ({
    type: "regulatory" as const,
    source: row.source,
    companyName: row.company_name,
    companyDomain: domainFromWebsite(row.website),
    personName: row.decision_maker_name ?? undefined,
    personTitle: row.decision_maker_title ?? undefined,
    evidence: {
      fitReason: row.fit_reason,
      sourceUrl: row.source_url,
      triggerCategory: row.trigger_category,
      regulatoryFramework: row.regulatory_framework,
    },
    url: row.source_url,
    strength: Math.max(0, Math.min(1, row.confidence / 100)),
    dedupeKey: `regulatory:discovered-lead:${row.id}`,
    detectedAt: row.retrieved_at,
  }));
}

export const regulatorySignalProvider: SignalProvider = {
  id: "signal-regulatory",
  label: "Regulatory trigger bridge",
  status(): SignalProviderStatus {
    const configured = getSeoSupabase() !== null;
    return { configured, missing: configured ? [] : ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] };
  },
  async run(_config: SignalConfig): Promise<SignalEventDraft[]> {
    if (!this.status().configured) return [];
    return bridgeRegulatoryLeadsToSignals();
  },
};
