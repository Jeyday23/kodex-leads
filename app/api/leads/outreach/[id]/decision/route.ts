import { decideLeadWorkPackage } from "@/lib/seo/lead-work-packages";

function hasApprovalControl(request: Request): boolean {
  const controlSecret = process.env.AUTOPILOT_CONTROL_SECRET;
  return Boolean(controlSecret && request.headers.get("x-kodex-control-secret") === controlSecret);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!hasApprovalControl(request)) {
    return Response.json({ status: "error", error: "Private approval key required." }, { status: 403 });
  }

  const { id } = await context.params;
  try {
    const body = await request.json() as { decision?: "approved" | "rejected" };
    if (body.decision !== "approved" && body.decision !== "rejected") {
      return Response.json({ status: "error", error: "decision must be approved or rejected" }, { status: 400 });
    }

    const item = await decideLeadWorkPackage(id, body.decision, "founder-approval");
    return Response.json({ status: "ok", item });
  } catch (error) {
    return Response.json({
      status: "error",
      error: error instanceof Error ? error.message : "Approval decision failed.",
    }, { status: 500 });
  }
}
