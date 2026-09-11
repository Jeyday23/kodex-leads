import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { deleteChannelVoiceById, updateChannelVoiceById } from "@/lib/growth/brain/store";

const patchSchema = z.object({
  tone: z.string().min(1).max(300).optional(),
  rules: z.array(z.string().min(1)).max(20).optional(),
  bannedTerms: z.array(z.string().min(1)).max(30).optional(),
  maxLength: z.number().int().min(1).max(20000).optional(),
  example: z.string().min(1).max(2000).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid channel voice payload.", 400);

  const result = await updateChannelVoiceById((await params).id, parsed.data);
  return result.ok ? apiSuccess(result) : apiError(result.error, 503);
}

/** Deletes the stored override; the channel reverts to the seed voice on next read. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const result = await deleteChannelVoiceById((await params).id);
  return result.ok ? apiSuccess(result) : apiError(result.error, 503);
}
