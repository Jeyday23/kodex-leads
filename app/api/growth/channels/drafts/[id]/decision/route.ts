import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { decideChannelDraft } from "@/lib/growth/channels/store";

const decisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const parsed = decisionSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid decision payload. Expected { decision: 'approved' | 'rejected' }.", 400);

  const { id } = await params;
  const result = await decideChannelDraft(id, parsed.data.decision, auth.actor);
  if (!result.ok) return apiError(result.error ?? "Could not record the decision.", 409);
  return apiSuccess({ id, decision: parsed.data.decision });
}
