import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { deletePersona, updatePersona } from "@/lib/growth/brain/store";

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  title: z.string().min(1).max(200).optional(),
  goals: z.array(z.string().min(1)).max(20).optional(),
  pains: z.array(z.string().min(1)).max(20).optional(),
  triggers: z.array(z.string().min(1)).max(20).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid persona payload.", 400);

  const result = await updatePersona((await params).id, parsed.data);
  return result.ok ? apiSuccess(result) : apiError(result.error, 503);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const result = await deletePersona((await params).id);
  return result.ok ? apiSuccess(result) : apiError(result.error, 503);
}
