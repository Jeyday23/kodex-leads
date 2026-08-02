import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { generateEditorialDraft, getEditorialItem, updateEditorialStatus } from "@/lib/authority/editorial";

const schema = z.object({
  action: z.enum(["status", "generate_draft"]),
  status: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;
  const item = await getEditorialItem((await params).id);
  if (!item) return apiError("Editorial item not found.", 404);
  return apiSuccess(item);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid editorial payload.", 400);
  const id = (await params).id;
  const result = parsed.data.action === "generate_draft"
    ? await generateEditorialDraft(id, auth.actor)
    : await updateEditorialStatus(id, parsed.data.status ?? "researching", auth.actor, parsed.data.notes);
  if (!result.ok) return apiError(result.error ?? "Editorial update failed.", 400);
  return apiSuccess(result);
}
