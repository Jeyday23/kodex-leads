import "server-only";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { promises as fs } from "fs";
import path from "path";
import type { MediaJob, MediaJobStatus } from "./types";

const fallbackPath = path.join(process.cwd(), ".data", "media-jobs.json");

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function fromRow(row: Record<string, unknown>): MediaJob {
  return {
    id: String(row.id),
    title: String(row.title),
    sourceType: String(row.source_type ?? "manual"),
    sourceId: row.source_id ? String(row.source_id) : null,
    kind: row.kind as MediaJob["kind"],
    aspectRatio: String(row.aspect_ratio ?? "1:1"),
    brief: String(row.brief),
    prompt: String(row.prompt),
    provider: String(row.provider ?? "queue-only"),
    model: row.model ? String(row.model) : null,
    providerRequestId: row.provider_request_id ? String(row.provider_request_id) : null,
    providerStatusUrl: row.provider_status_url ? String(row.provider_status_url) : null,
    resultUrl: row.result_url ? String(row.result_url) : null,
    status: row.status as MediaJobStatus,
    error: row.error ? String(row.error) : null,
    createdBy: String(row.created_by ?? "system"),
    reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function toRow(job: MediaJob) {
  return {
    id: job.id,
    title: job.title,
    source_type: job.sourceType,
    source_id: job.sourceId ?? null,
    kind: job.kind,
    aspect_ratio: job.aspectRatio,
    brief: job.brief,
    prompt: job.prompt,
    provider: job.provider,
    model: job.model ?? null,
    provider_request_id: job.providerRequestId ?? null,
    provider_status_url: job.providerStatusUrl ?? null,
    result_url: job.resultUrl ?? null,
    status: job.status,
    error: job.error ?? null,
    created_by: job.createdBy,
    reviewed_by: job.reviewedBy ?? null,
    reviewed_at: job.reviewedAt ?? null,
    created_at: job.createdAt,
    updated_at: job.updatedAt,
  };
}

async function readFallback(): Promise<MediaJob[]> {
  try {
    return JSON.parse(await fs.readFile(fallbackPath, "utf8")) as MediaJob[];
  } catch {
    return [];
  }
}

async function writeFallback(jobs: MediaJob[]) {
  await fs.mkdir(path.dirname(fallbackPath), { recursive: true });
  await fs.writeFile(fallbackPath, JSON.stringify(jobs, null, 2));
}

export function newMediaJob(input: Omit<MediaJob, "id" | "createdAt" | "updatedAt">): MediaJob {
  const now = new Date().toISOString();
  return { ...input, id: randomUUID(), createdAt: now, updatedAt: now };
}

export async function saveMediaJob(job: MediaJob): Promise<MediaJob> {
  const client = supabaseAdmin();
  if (client) {
    const { data, error } = await client.from("media_jobs").upsert(toRow(job)).select("*").single();
    if (!error && data) return fromRow(data as Record<string, unknown>);
  }

  const jobs = await readFallback();
  const index = jobs.findIndex((item) => item.id === job.id);
  if (index >= 0) jobs[index] = job;
  else jobs.unshift(job);
  await writeFallback(jobs);
  return job;
}

export async function listMediaJobs(limit = 50): Promise<MediaJob[]> {
  const client = supabaseAdmin();
  if (client) {
    const { data, error } = await client.from("media_jobs").select("*").order("created_at", { ascending: false }).limit(limit);
    if (!error && data) return data.map((row) => fromRow(row as Record<string, unknown>));
  }
  return (await readFallback()).slice(0, limit);
}

export async function getMediaJob(id: string): Promise<MediaJob | null> {
  const client = supabaseAdmin();
  if (client) {
    const { data, error } = await client.from("media_jobs").select("*").eq("id", id).maybeSingle();
    if (!error && data) return fromRow(data as Record<string, unknown>);
  }
  return (await readFallback()).find((item) => item.id === id) ?? null;
}

export async function patchMediaJob(id: string, patch: Partial<MediaJob>): Promise<MediaJob | null> {
  const current = await getMediaJob(id);
  if (!current) return null;
  return saveMediaJob({ ...current, ...patch, id: current.id, updatedAt: new Date().toISOString() });
}
