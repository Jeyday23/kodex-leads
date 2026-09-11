// WS3 sequence/enrollment/task persistence. Same seed-fallback pattern as
// the rest of the Growth Engine: no sequences exist until an admin creates
// one, so an unconfigured or empty Supabase returns an honest empty list
// rather than inventing placeholder data.

import { getSeoSupabase } from "@/lib/seo/db";
import type { Enrollment, EnrollmentState, OutreachTaskDraft, SequenceStep, TimelineEntry } from "./engine";
import type { SendWindow } from "./caps";

export interface SequenceRecord {
  id: string;
  name: string;
  channel: "email" | "linkedin_manual";
  objective: string | null;
  calendarLink: string | null;
  steps: SequenceStep[];
  dailyCap: number;
  sendWindow: SendWindow;
  status: string;
}

export interface CreateSequenceInput {
  name: string;
  channel: "email" | "linkedin_manual";
  objective?: string;
  calendarLink?: string;
  steps: SequenceStep[];
  dailyCap: number;
  sendWindow: SendWindow;
}

export interface OutreachTaskRecord {
  id: string;
  enrollmentId: string;
  kind: OutreachTaskDraft["kind"];
  draftCopy: string | null;
  status: "queued" | "approved" | "done" | "skipped";
  dueAt: string | null;
}

export async function listSequences(): Promise<SequenceRecord[]> {
  const supabase = getSeoSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("growth_sequences")
    .select("id, name, channel, objective, calendar_link, steps, daily_cap, send_window, status")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    channel: row.channel,
    objective: row.objective,
    calendarLink: row.calendar_link,
    steps: row.steps ?? [],
    dailyCap: row.daily_cap,
    sendWindow: row.send_window ?? { startHour: 9, endHour: 17 },
    status: row.status,
  }));
}

export async function getSequence(id: string): Promise<SequenceRecord | null> {
  const supabase = getSeoSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("growth_sequences")
    .select("id, name, channel, objective, calendar_link, steps, daily_cap, send_window, status")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id,
    name: data.name,
    channel: data.channel,
    objective: data.objective,
    calendarLink: data.calendar_link,
    steps: data.steps ?? [],
    dailyCap: data.daily_cap,
    sendWindow: data.send_window ?? { startHour: 9, endHour: 17 },
    status: data.status,
  };
}

export async function createSequence(input: CreateSequenceInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const { data, error } = await supabase
    .from("growth_sequences")
    .insert({
      name: input.name,
      channel: input.channel,
      objective: input.objective ?? null,
      calendar_link: input.calendarLink ?? null,
      steps: input.steps,
      daily_cap: input.dailyCap,
      send_window: input.sendWindow,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Sequence was not created." };
  return { ok: true, id: data.id };
}

export async function createEnrollment(
  sequenceId: string,
  leadRef: string,
  leadTable: string,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const { data, error } = await supabase
    .from("growth_sequence_enrollments")
    .insert({ sequence_id: sequenceId, lead_ref: leadRef, lead_table: leadTable, state: "pending", timeline: [] })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Enrollment was not created." };
  return { ok: true, id: data.id };
}

export async function getEnrollment(id: string): Promise<Enrollment | null> {
  const supabase = getSeoSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("growth_sequence_enrollments")
    .select("id, sequence_id, lead_ref, lead_table, state, timeline")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id,
    sequenceId: data.sequence_id,
    leadRef: data.lead_ref,
    leadTable: data.lead_table,
    state: data.state as EnrollmentState,
    timeline: (data.timeline ?? []) as TimelineEntry[],
  };
}

export async function saveEnrollment(enrollment: Enrollment): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const { error } = await supabase
    .from("growth_sequence_enrollments")
    .update({ state: enrollment.state, timeline: enrollment.timeline, updated_at: new Date().toISOString() })
    .eq("id", enrollment.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function listEnrollments(sequenceId?: string): Promise<Enrollment[]> {
  const supabase = getSeoSupabase();
  if (!supabase) return [];

  let query = supabase.from("growth_sequence_enrollments").select("id, sequence_id, lead_ref, lead_table, state, timeline");
  if (sequenceId) query = query.eq("sequence_id", sequenceId);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    sequenceId: row.sequence_id,
    leadRef: row.lead_ref,
    leadTable: row.lead_table,
    state: row.state as EnrollmentState,
    timeline: (row.timeline ?? []) as TimelineEntry[],
  }));
}

export async function createOutreachTask(
  enrollmentId: string,
  task: OutreachTaskDraft,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const { data, error } = await supabase
    .from("growth_outreach_tasks")
    .insert({
      enrollment_id: enrollmentId,
      kind: task.kind,
      draft_copy: task.draftCopy,
      status: task.status,
      due_at: task.dueAt,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Task was not created." };
  return { ok: true, id: data.id };
}

export async function listOutreachTasks(status?: string): Promise<OutreachTaskRecord[]> {
  const supabase = getSeoSupabase();
  if (!supabase) return [];

  let query = supabase.from("growth_outreach_tasks").select("id, enrollment_id, kind, draft_copy, status, due_at");
  if (status) query = query.eq("status", status);

  const { data, error } = await query.order("due_at", { ascending: true });
  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    enrollmentId: row.enrollment_id,
    kind: row.kind,
    draftCopy: row.draft_copy,
    status: row.status,
    dueAt: row.due_at,
  }));
}

export async function updateTaskStatus(
  id: string,
  status: OutreachTaskRecord["status"],
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const { error } = await supabase
    .from("growth_outreach_tasks")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Counts tasks of kind "email" moved to done today (Europe/Berlin calendar
 * day), used by caps.ts callers to enforce the daily send cap. */
export async function countEmailTasksSentToday(): Promise<number> {
  const supabase = getSeoSupabase();
  if (!supabase) return 0;

  const startOfDayUtc = new Date();
  startOfDayUtc.setUTCHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("growth_outreach_tasks")
    .select("id", { count: "exact", head: true })
    .eq("kind", "email")
    .eq("status", "done")
    .gte("updated_at", startOfDayUtc.toISOString());

  if (error || count === null) return 0;
  return count;
}
