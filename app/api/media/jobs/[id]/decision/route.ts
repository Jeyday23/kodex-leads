import { NextResponse } from "next/server";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { getMediaJob, patchMediaJob } from "@/lib/media/store";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const job = await getMediaJob(id);
  if (!job) return NextResponse.json({ status: "error", error: "Media job not found" }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const decision = String(body.decision ?? "");
  if (!['approve', 'reject'].includes(decision)) {
    return NextResponse.json({ status: "error", error: "decision must be approve or reject" }, { status: 400 });
  }
  if (decision === "approve" && job.status !== "completed") {
    return NextResponse.json({ status: "error", error: "Only completed media can be approved." }, { status: 409 });
  }

  const now = new Date().toISOString();
  const updated = await patchMediaJob(id, {
    status: decision === "approve" ? "approved" : "rejected",
    reviewedBy: auth.actor,
    reviewedAt: now,
  });
  return NextResponse.json({ status: "ok", job: updated });
}
