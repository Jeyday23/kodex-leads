import { apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { getAuthoritySystemStatus } from "@/lib/authority/status";

export async function GET(request: Request) {
  const auth = await requireAuthorityApi(request, { allowCron: true });
  if (!auth.ok) return auth.response;
  return apiSuccess(await getAuthoritySystemStatus());
}
