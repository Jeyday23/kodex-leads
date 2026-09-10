// Reads back stored site-audit rows: the latest row per kind/device, and a
// trend series (score over time) per kind/device for the admin UI's trend
// lines. Returns empty results - never throws, never fabricates - when
// Supabase is not configured or a query fails.

import { getSeoSupabase } from "@/lib/seo/db";

export type AuditKind = "lighthouse" | "technical" | "geo" | "site_files";
export type AuditDevice = "mobile" | "desktop" | null;

export interface AuditRow {
  id: string;
  url: string;
  kind: AuditKind;
  device: AuditDevice;
  score: number | null;
  payload: unknown;
  issues: unknown;
  measuredAt: string;
}

export interface TrendPoint {
  measuredAt: string;
  score: number | null;
}

function mapRow(row: Record<string, unknown>): AuditRow {
  return {
    id: String(row.id),
    url: String(row.url),
    kind: row.kind as AuditKind,
    device: (row.device as AuditDevice) ?? null,
    score: typeof row.score === "number" ? row.score : row.score === null ? null : Number(row.score),
    payload: row.payload,
    issues: row.issues,
    measuredAt: String(row.measured_at),
  };
}

/**
 * Latest row per (kind, device) for one URL. Empty array when Supabase is
 * unconfigured or the table has no rows yet - the caller renders an honest
 * "No audit yet" state rather than placeholder numbers.
 */
export async function getLatestAudits(url: string): Promise<AuditRow[]> {
  const supabase = getSeoSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("growth_site_audits")
    .select("id, url, kind, device, score, payload, issues, measured_at")
    .eq("url", url)
    .order("measured_at", { ascending: false })
    .limit(200);

  if (error || !data) return [];

  const latestByKey = new Map<string, AuditRow>();
  for (const raw of data) {
    const row = mapRow(raw as Record<string, unknown>);
    const key = `${row.kind}:${row.device ?? ""}`;
    if (!latestByKey.has(key)) latestByKey.set(key, row);
  }

  return [...latestByKey.values()];
}

/**
 * Score trend for one (url, kind, device) over the last `days` days, oldest
 * first. Empty when Supabase is unconfigured or there is no history yet.
 */
export async function getAuditTrend(
  url: string,
  kind: AuditKind,
  days: number,
  device: AuditDevice = null,
): Promise<TrendPoint[]> {
  const supabase = getSeoSupabase();
  if (!supabase) return [];

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from("growth_site_audits")
    .select("score, measured_at, device")
    .eq("url", url)
    .eq("kind", kind)
    .gte("measured_at", since)
    .order("measured_at", { ascending: true });

  query = device === null ? query.is("device", null) : query.eq("device", device);

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((row) => ({
    measuredAt: String((row as Record<string, unknown>).measured_at),
    score: typeof (row as Record<string, unknown>).score === "number" ? ((row as Record<string, unknown>).score as number) : null,
  }));
}

/** Trend series for every kind/device combination that has data, for the UI. */
export async function getAllAuditTrends(url: string, days: number): Promise<Record<string, TrendPoint[]>> {
  const supabase = getSeoSupabase();
  if (!supabase) return {};

  const combos: Array<{ kind: AuditKind; device: AuditDevice }> = [
    { kind: "lighthouse", device: "mobile" },
    { kind: "lighthouse", device: "desktop" },
    { kind: "technical", device: null },
    { kind: "geo", device: null },
    { kind: "site_files", device: null },
  ];

  const entries = await Promise.all(
    combos.map(async (combo) => {
      const key = `${combo.kind}:${combo.device ?? ""}`;
      const trend = await getAuditTrend(url, combo.kind, days, combo.device);
      return [key, trend] as const;
    }),
  );

  return Object.fromEntries(entries);
}
