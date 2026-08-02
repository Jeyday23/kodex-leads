import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { applyOpportunityDecision } from "@/lib/authority/opportunities";

const decisionSchema = z.object({
  decision: z.enum(["Build", "Expand", "Merge", "Research", "Ignore", "Archive"]),
  reason: z.string().max(500).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;
  const parsed = decisionSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid decision payload.", 400);

  const result = await applyOpportunityDecision((await params).id, parsed.data.decision, auth.actor, { reason: parsed.data.reason });
  if (!result.ok) return apiError(result.error ?? "Decision failed.", 400);
  return apiSuccess(result);
}
