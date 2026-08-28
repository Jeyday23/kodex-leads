import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { mergeOpportunity } from "@/lib/authority/opportunities";

const mergeSchema = z.object({
  canonicalId: z.string().uuid().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;
  const id = (await params).id;
  const parsed = mergeSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid merge payload.", 400);
  if (!parsed.data.canonicalId) return apiError("A canonical opportunity is required for merge.", 400);

  const result = await mergeOpportunity(id, parsed.data.canonicalId, auth.actor);
  if (!result.ok) return apiError(result.error ?? "Merge failed.", 400);
  return apiSuccess(result);
}
