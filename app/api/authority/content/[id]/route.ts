import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { getContentAsset } from "@/lib/authority/autonomous-ranking";

const patchSchema = z.object({
  action: z.enum(["refresh"]).optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;
  const asset = await getContentAsset((await params).id);
  if (!asset) return apiError("Content asset not found.", 404);
  return apiSuccess(asset);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid content asset update.", 400);
  const asset = await getContentAsset((await params).id);
  if (!asset) return apiError("Content asset not found.", 404);
  return apiSuccess(asset);
}
