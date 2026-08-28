import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { approveContentAsset } from "@/lib/authority/autonomous-ranking";

const schema = z.object({ note: z.string().max(1000).optional() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("Invalid approval payload.", 400);
  const result = await approveContentAsset((await params).id, auth.actor, parsed.data.note);
  if (!result.ok) return apiError(result.error ?? "Approval failed.", 400);
  return apiSuccess(result);
}
