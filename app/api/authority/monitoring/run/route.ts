import { runAuthorityMonitoringCycle } from "@/lib/authority/monitoring";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { rateLimit } from "@/lib/authority/rate-limit";

export async function POST(request: Request) {
  const auth = await requireAuthorityApi(request, { allowCron: true });
  if (!auth.ok) return auth.response;
  const limit = rateLimit(`monitoring:${auth.actor}`, 3, 10 * 60_000);
  if (!limit.allowed) return apiError(`Monitoring is rate limited. Retry after ${limit.retryAfterSeconds}s.`, 429);

  const result = await runAuthorityMonitoringCycle({ promptLimit: 5 });
  return apiSuccess(result);
}
