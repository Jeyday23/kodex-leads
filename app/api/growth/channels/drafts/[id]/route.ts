import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { getChannelDraft } from "@/lib/growth/channels/store";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const draft = await getChannelDraft((await params).id);
  if (!draft) return apiError("Draft not found.", 404);
  return apiSuccess(draft);
}
