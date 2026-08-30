import { NextResponse } from "next/server";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { buildKodexMediaPrompt } from "@/lib/media/brand";
import { mediaProviderReadiness, submitMediaGeneration } from "@/lib/media/provider";
import { listMediaJobs, newMediaJob, saveMediaJob } from "@/lib/media/store";
import type { MediaKind } from "@/lib/media/types";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    provider: mediaProviderReadiness(),
    jobs: await listMediaJobs(),
  });
}

export async function POST(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  const brief = String(body.brief ?? "").trim();
  const kind = String(body.kind ?? "image") as MediaKind;
  const aspectRatio = String(body.aspectRatio ?? (kind === "video" ? "16:9" : "1:1"));
  if (!title || !brief || !["image", "video"].includes(kind)) {
    return NextResponse.json({ status: "error", error: "title, brief and a valid kind are required" }, { status: 400 });
  }

  const job = newMediaJob({
    title,
    sourceType: String(body.sourceType ?? "manual"),
    sourceId: body.sourceId ? String(body.sourceId) : null,
    kind,
    aspectRatio,
    brief,
    prompt: buildKodexMediaPrompt({ title, brief, kind, aspectRatio }),
    provider: process.env.MEDIA_PROVIDER ?? "queue-only",
    model: null,
    providerRequestId: null,
    providerStatusUrl: null,
    resultUrl: null,
    status: "pending_generation",
    error: null,
    createdBy: auth.actor,
    reviewedBy: null,
    reviewedAt: null,
  });
  await saveMediaJob(job);

  try {
    const submitted = await submitMediaGeneration(job);
    const saved = await saveMediaJob({
      ...job,
      ...submitted,
      updatedAt: new Date().toISOString(),
    });
    return NextResponse.json({ status: "ok", job: saved, provider: mediaProviderReadiness() }, { status: 201 });
  } catch (error) {
    const saved = await saveMediaJob({
      ...job,
      status: "failed",
      error: error instanceof Error ? error.message : "Media generation failed",
      updatedAt: new Date().toISOString(),
    });
    return NextResponse.json({ status: "error", error: saved.error, job: saved }, { status: 502 });
  }
}
