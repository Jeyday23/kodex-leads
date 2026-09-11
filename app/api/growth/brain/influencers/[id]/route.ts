import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { deleteInfluencer, updateInfluencer } from "@/lib/growth/brain/store";

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  handle: z.string().min(1).max(200).optional(),
  platform: z.string().min(1).max(100).optional(),
  why: z.string().max(500).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid influencer payload.", 400);

  const result = await updateInfluencer((await params).id, parsed.data);
  return result.ok ? apiSuccess(result) : apiError(result.error, 503);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const result = await deleteInfluencer((await params).id);
  return result.ok ? apiSuccess(result) : apiError(result.error, 503);
}
