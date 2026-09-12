import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { deleteSignalConfigById, updateSignalConfigById } from "@/lib/growth/brain/store";

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  targets: z.array(z.string().min(1)).max(50).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid signal config payload.", 400);

  const result = await updateSignalConfigById((await params).id, parsed.data);
  return result.ok ? apiSuccess(result) : apiError(result.error, 503);
}

/** Deletes the stored override; the signal type reverts to the seed config on next read. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const result = await deleteSignalConfigById((await params).id);
  return result.ok ? apiSuccess(result) : apiError(result.error, 503);
}
