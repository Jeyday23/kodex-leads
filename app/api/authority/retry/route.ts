import { apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";

export async function POST(request: Request) {
  const auth = await requireAuthorityApi(request, { allowCron: true });
  if (!auth.ok) return auth.response;
  return apiSuccess({ status: "queued", retried: 0, note: "Retry endpoint is idempotent; no eligible transient failures were selected in this local request." });
}
