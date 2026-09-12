import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { confirmCmoAction } from "@/lib/growth/cmo/actions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const result = await confirmCmoAction((await params).id, auth.actor);
  if (!result.ok) return apiError(result.error, result.configured ? 409 : 503);
  return apiSuccess(result.item);
}
