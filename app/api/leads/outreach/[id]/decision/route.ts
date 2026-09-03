import { requireAuthorityApi } from "@/lib/authority/auth";
import { decideLeadWorkPackage } from "@/lib/seo/lead-work-packages";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  // Outreach approval is a founder decision and is never automated.
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  try {
    const body = await request.json() as { decision?: "approved" | "rejected" };
    if (body.decision !== "approved" && body.decision !== "rejected") {
      return Response.json({ status: "error", error: "decision must be approved or rejected" }, { status: 400 });
    }

    const item = await decideLeadWorkPackage(id, body.decision, auth.actor);
    return Response.json({ status: "ok", item });
  } catch (error) {
    return Response.json({
      status: "error",
      error: error instanceof Error ? error.message : "Approval decision failed.",
    }, { status: 500 });
  }
}
