import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { publishContentAsset } from "@/lib/authority/autonomous-ranking";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request, { allowCron: true });
  if (!auth.ok) return auth.response;
  const result = await publishContentAsset((await params).id, auth.actor);
  if (!result.ok) return apiError(result.error ?? "Publication failed.", 400);
  return apiSuccess(result);
}
