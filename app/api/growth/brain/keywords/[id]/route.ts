import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { deleteKeyword, updateKeyword } from "@/lib/growth/brain/store";

const patchSchema = z.object({
  term: z.string().min(1).max(200).optional(),
  type: z.enum(["product", "problem", "competitor"]).optional(),
  language: z.string().min(2).max(12).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid keyword payload.", 400);

  const result = await updateKeyword((await params).id, parsed.data);
  return result.ok ? apiSuccess(result) : apiError(result.error, 503);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const result = await deleteKeyword((await params).id);
  return result.ok ? apiSuccess(result) : apiError(result.error, 503);
}
