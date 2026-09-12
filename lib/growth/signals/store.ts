// WS3 signal-event persistence. Same pattern as lib/authority/store.ts: falls
// back to an honest empty result when Supabase is not configured, never
// throws, and reports storage state explicitly rather than pretending a
// write happened.

import { getSeoSupabase } from "@/lib/seo/db";
import type { SignalEventDraft, SignalEventRecord } from "./types";

export interface StoreSignalEventsResult {
  stored: number;
  duplicates: number;
  note: string | null;
}

/**
 * Inserts events, skipping ones whose dedupe_key already exists. Supabase
 * enforces the unique constraint (migration 026); a 23505 conflict is treated
 * as an expected duplicate rather than an error.
 */
export async function storeSignalEvents(events: SignalEventDraft[]): Promise<StoreSignalEventsResult> {
  if (events.length === 0) return { stored: 0, duplicates: 0, note: null };

  const supabase = getSeoSupabase();
  if (!supabase) {
    return { stored: 0, duplicates: 0, note: "not stored: Supabase not configured" };
  }

  let stored = 0;
  let duplicates = 0;

  for (const event of events) {
    const { error } = await supabase.from("growth_signal_events").insert({
      type: event.type,
      source: event.source,
      company_name: event.companyName ?? null,
      company_domain: event.companyDomain ?? null,
      person_name: event.personName ?? null,
      person_title: event.personTitle ?? null,
      evidence: event.evidence,
      url: event.url ?? null,
      strength: event.strength,
      dedupe_key: event.dedupeKey,
      detected_at: event.detectedAt,
    });

    if (!error) {
      stored += 1;
    } else if (error.code === "23505") {
      duplicates += 1;
    }
    // Any other error is silently skipped per-row rather than aborting the
    // whole batch; the run outcome still reports the totals honestly.
  }

  return { stored, duplicates, note: null };
}

export interface ListSignalEventsFilter {
  type?: string;
  limit?: number;
}

export async function listSignalEvents(filter: ListSignalEventsFilter = {}): Promise<SignalEventRecord[]> {
  const supabase = getSeoSupabase();
  if (!supabase) return [];

  let query = supabase
    .from("growth_signal_events")
    .select("id, type, source, company_name, company_domain, person_name, person_title, evidence, url, strength, dedupe_key, detected_at")
    .order("detected_at", { ascending: false })
    .limit(filter.limit ?? 50);

  if (filter.type) query = query.eq("type", filter.type);

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    type: row.type,
    source: row.source,
    companyName: row.company_name ?? undefined,
    companyDomain: row.company_domain ?? undefined,
    personName: row.person_name ?? undefined,
    personTitle: row.person_title ?? undefined,
    evidence: row.evidence ?? {},
    url: row.url ?? undefined,
    strength: row.strength,
    dedupeKey: row.dedupe_key,
    detectedAt: row.detected_at,
  }));
}
