import { apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { auditPublishedPage, getContentAsset } from "@/lib/authority/autonomous-ranking";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request, { allowCron: true });
  if (!auth.ok) return auth.response;
  const asset = await getContentAsset((await params).id);
  const result = await auditPublishedPage((await params).id, asset?.contentPageId, asset?.routePath);
  return apiSuccess(result);
}
