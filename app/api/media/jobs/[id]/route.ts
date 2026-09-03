import { NextResponse } from "next/server";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { refreshMediaGeneration } from "@/lib/media/provider";
import { getMediaJob, patchMediaJob } from "@/lib/media/store";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const job = await getMediaJob(id);
  if (!job) return NextResponse.json({ status: "error", error: "Media job not found" }, { status: 404 });

  if (["queued", "processing"].includes(job.status)) {
    const patch = await refreshMediaGeneration(job);
    const refreshed = Object.keys(patch).length ? await patchMediaJob(id, patch) : job;
    return NextResponse.json({ status: "ok", job: refreshed });
  }
  return NextResponse.json({ status: "ok", job });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const job = await getMediaJob(id);
  if (!job) return NextResponse.json({ status: "error", error: "Media job not found" }, { status: 404 });
  const patch = await refreshMediaGeneration(job);
  const refreshed = Object.keys(patch).length ? await patchMediaJob(id, patch) : job;
  return NextResponse.json({ status: "ok", job: refreshed });
}
