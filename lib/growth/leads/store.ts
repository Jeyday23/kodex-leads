// WS3 lead-score persistence. Same seed-fallback pattern as the rest of the
// Growth Engine: an unconfigured Supabase never throws, it just reports an
// honest empty state or a not-stored note.

import { getSeoSupabase } from "@/lib/seo/db";
import type { ExplainableScoreResult } from "./explainable-score";

export interface LeadScoreRecord {
  id: string;
  leadRef: string;
  leadTable: string;
  confidence: number;
  factors: ExplainableScoreResult["factors"];
  rationale: string | null;
  scoredAt: string;
}

export interface StoreLeadScoreResult {
  ok: boolean;
  id?: string;
  note?: string;
}

export async function storeLeadScore(
  leadRef: string,
  leadTable: string,
  score: ExplainableScoreResult,
  rationale: string | null,
): Promise<StoreLeadScoreResult> {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, note: "not stored: Supabase not configured" };

  const { data, error } = await supabase
    .from("growth_lead_scores")
    .insert({
      lead_ref: leadRef,
      lead_table: leadTable,
      confidence: score.confidence,
      factors: score.factors,
      rationale,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, note: error?.message ?? "Lead score was not stored." };
  return { ok: true, id: data.id };
}

export async function listLeadScores(limit = 50): Promise<LeadScoreRecord[]> {
  const supabase = getSeoSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("growth_lead_scores")
    .select("id, lead_ref, lead_table, confidence, factors, rationale, scored_at")
    .order("scored_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    leadRef: row.lead_ref,
    leadTable: row.lead_table,
    confidence: row.confidence,
    factors: row.factors ?? [],
    rationale: row.rationale,
    scoredAt: row.scored_at,
  }));
}
