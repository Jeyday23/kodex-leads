// Supabase-backed store for WS4 channel content, with seed fallback for
// every read and an honest "not configured" result for every write, matching
// the pattern in lib/authority/store.ts. Must not import "server-only":
// scripts/run-growth-planner.ts reaches this module under plain tsx.

import { getSeoSupabase } from "@/lib/seo/db";
import type { ChannelVoice } from "@/lib/growth/context";
import type { QualityGateResult } from "./quality-gate";
import type { DraftChannel } from "./draft";
import type { ScoredRedditThread } from "./reddit-discovery";

export type DraftStatus = "draft" | "approved" | "scheduled" | "published" | "rejected";

export interface ChannelDraftRecord {
  id: string;
  channel: DraftChannel;
  status: DraftStatus;
  title: string | null;
  body: string;
  sourceRef: Record<string, unknown>;
  voiceSnapshot: ChannelVoice | Record<string, never>;
  quality: QualityGateResult | Record<string, never>;
  rationale: string | null;
  scheduledFor: string | null;
  publishedUrl: string | null;
  createdBy: string | null;
  decidedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewChannelDraftInput {
  channel: DraftChannel;
  title: string | null;
  body: string;
  sourceRef: Record<string, unknown>;
  voiceSnapshot: ChannelVoice;
  quality: QualityGateResult;
  rationale: string | null;
  createdBy?: string;
}

function mapDraftRow(row: Record<string, unknown>): ChannelDraftRecord {
  return {
    id: String(row.id),
    channel: row.channel as DraftChannel,
    status: row.status as DraftStatus,
    title: (row.title as string | null) ?? null,
    body: String(row.body ?? ""),
    sourceRef: (row.source_ref as Record<string, unknown>) ?? {},
    voiceSnapshot: (row.voice_snapshot as ChannelVoice) ?? {},
    quality: (row.quality as QualityGateResult) ?? {},
    rationale: (row.rationale as string | null) ?? null,
    scheduledFor: (row.scheduled_for as string | null) ?? null,
    publishedUrl: (row.published_url as string | null) ?? null,
    createdBy: (row.created_by as string | null) ?? null,
    decidedBy: (row.decided_by as string | null) ?? null,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

/**
 * Persists a drafted (or skipped-but-still-worth-recording) channel draft.
 * Returns `null` when Supabase is not configured - the caller (draft.ts's
 * result, or the article brief text) remains the source of truth in that
 * case and is returned directly to the API caller instead of a database id.
 */
export async function createChannelDraft(input: NewChannelDraftInput): Promise<ChannelDraftRecord | null> {
  const supabase = getSeoSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("growth_channel_drafts")
    .insert({
      channel: input.channel,
      status: "draft",
      title: input.title,
      body: input.body,
      source_ref: input.sourceRef,
      voice_snapshot: input.voiceSnapshot,
      quality: input.quality,
      rationale: input.rationale,
      created_by: input.createdBy ?? null,
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return mapDraftRow(data);
}

export interface ListDraftsFilters {
  channel?: DraftChannel;
  status?: DraftStatus;
  limit?: number;
}

export async function listChannelDrafts(filters: ListDraftsFilters = {}): Promise<{ items: ChannelDraftRecord[]; configured: boolean }> {
  const supabase = getSeoSupabase();
  if (!supabase) return { items: [], configured: false };

  let query = supabase.from("growth_channel_drafts").select("*").order("created_at", { ascending: false }).limit(filters.limit ?? 100);
  if (filters.channel) query = query.eq("channel", filters.channel);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error || !data) return { items: [], configured: true };
  return { items: data.map(mapDraftRow), configured: true };
}

export async function getChannelDraft(id: string): Promise<ChannelDraftRecord | null> {
  const supabase = getSeoSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.from("growth_channel_drafts").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return mapDraftRow(data);
}

export async function decideChannelDraft(
  id: string,
  status: Extract<DraftStatus, "approved" | "rejected">,
  actor?: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const { error } = await supabase
    .from("growth_channel_drafts")
    .update({ status, decided_by: actor ?? null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Records a manually-pasted publish URL and flips the draft to `published`.
 * Shared by publish/linkedin.ts and publish/reddit.ts, which never call
 * fetch - see the module comments there for why.
 */
export async function recordManualPublish(
  id: string,
  publishedUrl: string,
  actor?: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const { error } = await supabase
    .from("growth_channel_drafts")
    .update({ status: "published", published_url: publishedUrl, decided_by: actor ?? null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function markChannelDraftPublished(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const { error } = await supabase
    .from("growth_channel_drafts")
    .update({ status: "published", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// --- Reddit opportunities ---------------------------------------------

export interface RedditOpportunityRecord {
  id: string;
  subreddit: string;
  threadUrl: string;
  title: string;
  snippet: string | null;
  matchedKeywords: string[];
  score: number;
  status: "new" | "drafted" | "skipped" | "answered";
  foundAt: string;
}

function mapOpportunityRow(row: Record<string, unknown>): RedditOpportunityRecord {
  return {
    id: String(row.id),
    subreddit: String(row.subreddit),
    threadUrl: String(row.thread_url),
    title: String(row.title),
    snippet: (row.snippet as string | null) ?? null,
    matchedKeywords: (row.matched_keywords as string[]) ?? [],
    score: Number(row.score ?? 0),
    status: row.status as RedditOpportunityRecord["status"],
    foundAt: String(row.found_at ?? ""),
  };
}

/**
 * Upserts discovered Reddit threads keyed on thread_url (the migration's
 * unique constraint). Returns the count actually written; when Supabase is
 * not configured, returns 0 without throwing.
 */
export async function saveRedditOpportunities(threads: ScoredRedditThread[]): Promise<number> {
  const supabase = getSeoSupabase();
  if (!supabase || threads.length === 0) return 0;

  const rows = threads.map((scored) => ({
    subreddit: scored.thread.subreddit,
    thread_url: scored.thread.permalink || scored.thread.url,
    title: scored.thread.title,
    snippet: scored.thread.snippet,
    matched_keywords: scored.matchedKeywords,
    score: scored.score,
    status: "new" as const,
    found_at: new Date().toISOString(),
  }));

  const { error, data } = await supabase
    .from("growth_reddit_opportunities")
    .upsert(rows, { onConflict: "thread_url", ignoreDuplicates: true })
    .select("id");

  if (error) return 0;
  return data?.length ?? 0;
}

export async function listRedditOpportunities(limit = 50): Promise<{ items: RedditOpportunityRecord[]; configured: boolean }> {
  const supabase = getSeoSupabase();
  if (!supabase) return { items: [], configured: false };
  const { data, error } = await supabase
    .from("growth_reddit_opportunities")
    .select("*")
    .order("found_at", { ascending: false })
    .limit(limit);
  if (error || !data) return { items: [], configured: true };
  return { items: data.map(mapOpportunityRow), configured: true };
}

// --- Channel settings ----------------------------------------------------

export interface ChannelSettingsRow {
  channel: DraftChannel;
  enabled: boolean;
  weeklyTarget: number;
  autoDraft: boolean;
}

export const DEFAULT_CHANNEL_SETTINGS: ChannelSettingsRow[] = [
  { channel: "article_brief", enabled: true, weeklyTarget: 7, autoDraft: false },
  { channel: "reddit", enabled: true, weeklyTarget: 14, autoDraft: false },
  { channel: "x", enabled: true, weeklyTarget: 7, autoDraft: false },
  { channel: "linkedin", enabled: true, weeklyTarget: 7, autoDraft: false },
  { channel: "email", enabled: false, weeklyTarget: 0, autoDraft: false },
];

export async function getChannelSettings(): Promise<ChannelSettingsRow[]> {
  const supabase = getSeoSupabase();
  if (!supabase) return DEFAULT_CHANNEL_SETTINGS;

  const { data, error } = await supabase.from("growth_channel_settings").select("channel, enabled, weekly_target, auto_draft");
  if (error || !data || data.length === 0) return DEFAULT_CHANNEL_SETTINGS;

  return data.map((row) => ({
    channel: row.channel as DraftChannel,
    enabled: Boolean(row.enabled),
    weeklyTarget: Number(row.weekly_target ?? 0),
    autoDraft: Boolean(row.auto_draft),
  }));
}

export async function updateChannelSettings(
  channel: DraftChannel,
  patch: Partial<Pick<ChannelSettingsRow, "enabled" | "weeklyTarget" | "autoDraft">>,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof patch.enabled === "boolean") updates.enabled = patch.enabled;
  if (typeof patch.weeklyTarget === "number") updates.weekly_target = patch.weeklyTarget;
  if (typeof patch.autoDraft === "boolean") updates.auto_draft = patch.autoDraft;

  const { error } = await supabase.from("growth_channel_settings").upsert({ channel, ...updates }, { onConflict: "channel" });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// --- Site audit issues (WS2's table; may not exist on this branch yet) ---

export interface SiteAuditIssue {
  url: string;
  kind: string;
  issue: string;
}

/**
 * Reads recent issues from WS2's `growth_site_audits` table (migration 025),
 * which is not part of this worktree and may not exist yet on a given
 * database. Tolerates both "table does not exist" (Postgres error code
 * 42P01, which PostgREST surfaces as a generic error) and an empty table by
 * returning an empty list rather than throwing.
 */
export async function getRecentAuditIssues(limit = 10): Promise<SiteAuditIssue[]> {
  const supabase = getSeoSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("growth_site_audits")
      .select("url, kind, issues")
      .order("measured_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];

    const issues: SiteAuditIssue[] = [];
    for (const row of data) {
      const rowIssues = Array.isArray(row.issues) ? row.issues : [];
      for (const issue of rowIssues) {
        const description = typeof issue === "string" ? issue : JSON.stringify(issue);
        issues.push({ url: String(row.url ?? ""), kind: String(row.kind ?? ""), issue: description });
      }
    }
    return issues.slice(0, limit);
  } catch {
    return [];
  }
}
