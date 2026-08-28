import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { reviseContentAsset } from "@/lib/authority/autonomous-ranking";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;
  const result = await reviseContentAsset((await params).id, auth.actor);
  if (!result.ok) {
    const message = "error" in result && typeof result.error === "string" ? result.error : "Revision failed.";
    return apiError(message, 400);
  }
  return apiSuccess(result);
}
