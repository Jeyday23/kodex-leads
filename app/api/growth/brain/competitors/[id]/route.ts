import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { deleteCompetitor, updateCompetitor } from "@/lib/growth/brain/store";

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  domain: z.string().min(1).max(300).optional(),
  summary: z.string().max(1000).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid competitor payload.", 400);

  const result = await updateCompetitor((await params).id, parsed.data);
  return result.ok ? apiSuccess(result) : apiError(result.error, 503);
}

/** Soft delete: marks the competitor row inactive rather than removing it. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const result = await deleteCompetitor((await params).id);
  return result.ok ? apiSuccess(result) : apiError(result.error, 503);
}
