import { getProviderStatuses } from "@/lib/authority/providers";
import { apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";

export async function GET(request: Request) {
  const auth = await requireAuthorityApi(request, { allowCron: true });
  if (!auth.ok) return auth.response;
  return apiSuccess({
    status: "ok",
    service: "authority-engine",
    checkedAt: new Date().toISOString(),
    providers: getProviderStatuses().map((provider) => ({
      name: provider.name,
      configured: provider.configured,
      missing: provider.missing,
    })),
  });
}
