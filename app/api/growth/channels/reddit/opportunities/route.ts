import { apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { listRedditOpportunities } from "@/lib/growth/channels/store";

/** A data read, not a run/discover endpoint: no allowCron here. */
export async function GET(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get("limit") ?? 50);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50;

  const result = await listRedditOpportunities(limit);
  return apiSuccess({ items: result.items, configured: result.configured });
}
