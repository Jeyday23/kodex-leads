import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { rateLimit } from "@/lib/authority/rate-limit";
import { runOpportunityDiscovery } from "@/lib/authority/opportunities";

export async function POST(request: Request) {
  const auth = await requireAuthorityApi(request, { allowCron: true });
  if (!auth.ok) return auth.response;

  const limit = rateLimit(`opportunity-discovery:${auth.actor}`, 3, 10 * 60_000);
  if (!limit.allowed) return apiError(`Discovery is rate limited. Retry after ${limit.retryAfterSeconds}s.`, 429);

  const idempotencyKey = request.headers.get("idempotency-key") ?? undefined;
  const result = await runOpportunityDiscovery({ actor: auth.actor, runType: auth.role === "system" ? "cron" : "manual", idempotencyKey });
  return apiSuccess(result);
}
