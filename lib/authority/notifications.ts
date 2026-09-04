// Intentionally NOT marked "server-only": this module is reached by the Render
// cron jobs and workers in scripts/ and workers/, which run under plain tsx.
// It reads no NEXT_PUBLIC_ credential; see lib/seo/db.ts for the same rule.
import { getSeoSupabase } from "@/lib/seo/db";

/**
 * Column contract for `authority_notifications`.
 *
 * The table is created by supabase/migrations/012_authority_operational_modules.sql
 * with exactly: id, category, severity, title, body, entity_type, entity_id,
 * read_at, created_at. There has never been a notification_type, message or
 * payload column in this repository, and production matches the migration.
 *
 * Two divergent inserts previously existed — one correct in
 * lib/authority/opportunities.ts, one wrong in lib/authority/autonomous-ranking.ts.
 * The wrong one failed every time with Postgres 42703 and the error was
 * discarded, so the autonomy jobs reported success while writing nothing. This
 * module is now the single writer so the two cannot drift again.
 */
export interface NotificationInput {
  /** Stored in `category`. */
  category: string;
  severity: string;
  title: string;
  /** Stored in `body`. */
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
}

export type NotificationResult =
  | { ok: true }
  | { ok: false; error: string };

interface InsertResponse {
  error: { message: string } | null;
}

interface NotificationClient {
  from(table: string): { insert(row: Record<string, unknown>): PromiseLike<InsertResponse> };
}

/** Maps the input onto the production column names. Exported for tests. */
export function notificationRow(input: NotificationInput): Record<string, unknown> {
  return {
    category: input.category,
    severity: input.severity,
    title: input.title,
    body: input.body ?? null,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
  };
}

/**
 * Writes one notification and REPORTS the outcome.
 *
 * Never throws: a notification is not worth failing an autonomy run over. But
 * the failure is logged and returned so the caller can put it in the job
 * result, rather than a job reporting success over a silent write loss.
 */
export async function createNotification(
  input: NotificationInput,
  client?: NotificationClient | null,
): Promise<NotificationResult> {
  const supabase = (client ?? getSeoSupabase()) as NotificationClient | null;
  if (!supabase) return failed(input, "Supabase is not configured.");

  try {
    const { error } = await supabase.from("authority_notifications").insert(notificationRow(input));
    if (error) return failed(input, error.message);
    return { ok: true };
  } catch (error) {
    return failed(input, error instanceof Error ? error.message : String(error));
  }
}

function failed(input: NotificationInput, error: string): NotificationResult {
  // Category and severity only. Titles and bodies can carry lead or draft
  // content and do not belong in the job log.
  console.error(JSON.stringify({
    scope: "authority-notification",
    status: "failed",
    category: input.category,
    severity: input.severity,
    error,
  }));
  return { ok: false, error };
}
