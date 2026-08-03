import { apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { syncSearchConsole } from "@/lib/authority/autonomous-ranking";

export async function POST(request: Request) {
  const auth = await requireAuthorityApi(request, { allowCron: true });
  if (!auth.ok) return auth.response;
  return apiSuccess(await syncSearchConsole({ actor: auth.actor }));
}
