import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { deleteObjection, updateObjection } from "@/lib/growth/brain/store";

const patchSchema = z.object({
  objection: z.string().min(1).max(500).optional(),
  response: z.string().min(1).max(1000).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid objection payload.", 400);

  const result = await updateObjection((await params).id, parsed.data);
  return result.ok ? apiSuccess(result) : apiError(result.error, 503);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const result = await deleteObjection((await params).id);
  return result.ok ? apiSuccess(result) : apiError(result.error, 503);
}
