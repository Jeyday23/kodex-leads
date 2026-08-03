import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { rollbackContentAsset } from "@/lib/authority/autonomous-ranking";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;
  const result = await rollbackContentAsset((await params).id, auth.actor);
  if (!result.ok) return apiError(result.error ?? "Rollback failed.", 400);
  return apiSuccess(result);
}
