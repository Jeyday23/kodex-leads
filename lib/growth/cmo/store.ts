import { getSeoSupabase } from "@/lib/seo/db";

export type CmoMessageRole = "user" | "assistant" | "system" | "tool";
export type CmoActionStatus = "proposed" | "confirmed" | "executed" | "rejected" | "failed";

export interface CmoThread {
  id: string;
  title: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CmoMessage {
  id: string;
  threadId: string;
  role: CmoMessageRole;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface CmoAction {
  id: string;
  threadId: string;
  messageId: string | null;
  actionType: string;
  title: string;
  payload: Record<string, unknown>;
  status: CmoActionStatus;
  result: Record<string, unknown>;
  createdBy: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CmoStoreList<T> = { items: T[]; configured: boolean; error?: string };
export type CmoStoreResult<T> = { ok: true; item: T } | { ok: false; error: string; configured: boolean };

const NOT_CONFIGURED = "Supabase is not configured for CMO storage.";

function mapThread(row: Record<string, unknown>): CmoThread {
  return {
    id: String(row.id),
    title: String(row.title ?? "CMO thread"),
    createdBy: (row.created_by as string | null) ?? null,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function mapMessage(row: Record<string, unknown>): CmoMessage {
  return {
    id: String(row.id),
    threadId: String(row.thread_id),
    role: row.role as CmoMessageRole,
    content: String(row.content ?? ""),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at ?? ""),
  };
}

function mapAction(row: Record<string, unknown>): CmoAction {
  return {
    id: String(row.id),
    threadId: String(row.thread_id),
    messageId: (row.message_id as string | null) ?? null,
    actionType: String(row.action_type),
    title: String(row.title ?? ""),
    payload: (row.payload as Record<string, unknown>) ?? {},
    status: row.status as CmoActionStatus,
    result: (row.result as Record<string, unknown>) ?? {},
    createdBy: (row.created_by as string | null) ?? null,
    decidedBy: (row.decided_by as string | null) ?? null,
    decidedAt: (row.decided_at as string | null) ?? null,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

export async function listCmoThreads(limit = 50): Promise<CmoStoreList<CmoThread>> {
  const supabase = getSeoSupabase();
  if (!supabase) return { items: [], configured: false, error: NOT_CONFIGURED };

  const { data, error } = await supabase
    .from("growth_cmo_threads")
    .select("id, title, created_by, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error || !data) return { items: [], configured: true, error: error?.message ?? "CMO threads are not available yet." };
  return { items: data.map(mapThread), configured: true };
}

export async function createCmoThread(title: string, actor?: string): Promise<CmoStoreResult<CmoThread>> {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: NOT_CONFIGURED, configured: false };

  const { data, error } = await supabase
    .from("growth_cmo_threads")
    .insert({ title: title.trim() || "CMO thread", created_by: actor ?? null })
    .select("id, title, created_by, created_at, updated_at")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Could not create CMO thread.", configured: true };
  return { ok: true, item: mapThread(data) };
}

export async function getCmoThread(id: string): Promise<CmoStoreResult<CmoThread>> {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: NOT_CONFIGURED, configured: false };

  const { data, error } = await supabase
    .from("growth_cmo_threads")
    .select("id, title, created_by, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) return { ok: false, error: error.message, configured: true };
  if (!data) return { ok: false, error: "CMO thread not found.", configured: true };
  return { ok: true, item: mapThread(data) };
}

export async function listCmoMessages(threadId: string, limit = 100): Promise<CmoStoreList<CmoMessage>> {
  const supabase = getSeoSupabase();
  if (!supabase) return { items: [], configured: false, error: NOT_CONFIGURED };

  const { data, error } = await supabase
    .from("growth_cmo_messages")
    .select("id, thread_id, role, content, metadata, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !data) return { items: [], configured: true, error: error?.message ?? "CMO messages are not available yet." };
  return { items: data.map(mapMessage), configured: true };
}

export async function addCmoMessage(input: {
  threadId: string;
  role: CmoMessageRole;
  content: string;
  metadata?: Record<string, unknown>;
}): Promise<CmoStoreResult<CmoMessage>> {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: NOT_CONFIGURED, configured: false };

  const { data, error } = await supabase
    .from("growth_cmo_messages")
    .insert({
      thread_id: input.threadId,
      role: input.role,
      content: input.content,
      metadata: input.metadata ?? {},
    })
    .select("id, thread_id, role, content, metadata, created_at")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Could not store CMO message.", configured: true };

  await supabase
    .from("growth_cmo_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", input.threadId);

  return { ok: true, item: mapMessage(data) };
}

export async function listCmoActions(threadId: string): Promise<CmoStoreList<CmoAction>> {
  const supabase = getSeoSupabase();
  if (!supabase) return { items: [], configured: false, error: NOT_CONFIGURED };

  const { data, error } = await supabase
    .from("growth_cmo_actions")
    .select("id, thread_id, message_id, action_type, title, payload, status, result, created_by, decided_by, decided_at, created_at, updated_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false });

  if (error || !data) return { items: [], configured: true, error: error?.message ?? "CMO actions are not available yet." };
  return { items: data.map(mapAction), configured: true };
}

export async function createCmoAction(input: {
  threadId: string;
  messageId?: string | null;
  actionType: string;
  title: string;
  payload: Record<string, unknown>;
  createdBy?: string;
}): Promise<CmoStoreResult<CmoAction>> {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: NOT_CONFIGURED, configured: false };

  const { data, error } = await supabase
    .from("growth_cmo_actions")
    .insert({
      thread_id: input.threadId,
      message_id: input.messageId ?? null,
      action_type: input.actionType,
      title: input.title,
      payload: input.payload,
      status: "proposed",
      created_by: input.createdBy ?? null,
    })
    .select("id, thread_id, message_id, action_type, title, payload, status, result, created_by, decided_by, decided_at, created_at, updated_at")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Could not create CMO action proposal.", configured: true };
  return { ok: true, item: mapAction(data) };
}

export async function getCmoAction(id: string): Promise<CmoStoreResult<CmoAction>> {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: NOT_CONFIGURED, configured: false };

  const { data, error } = await supabase
    .from("growth_cmo_actions")
    .select("id, thread_id, message_id, action_type, title, payload, status, result, created_by, decided_by, decided_at, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) return { ok: false, error: error.message, configured: true };
  if (!data) return { ok: false, error: "CMO action not found.", configured: true };
  return { ok: true, item: mapAction(data) };
}

export async function updateCmoActionStatus(
  id: string,
  status: Exclude<CmoActionStatus, "proposed">,
  actor?: string,
  result?: Record<string, unknown>,
): Promise<CmoStoreResult<CmoAction>> {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: NOT_CONFIGURED, configured: false };

  const { data, error } = await supabase
    .from("growth_cmo_actions")
    .update({
      status,
      result: result ?? {},
      decided_by: actor ?? null,
      decided_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, thread_id, message_id, action_type, title, payload, status, result, created_by, decided_by, decided_at, created_at, updated_at")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Could not update CMO action.", configured: true };
  return { ok: true, item: mapAction(data) };
}
