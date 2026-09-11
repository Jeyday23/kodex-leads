import { apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { listLeadScores } from "@/lib/growth/leads/store";

export async function GET(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Math.min(200, Math.max(1, Number(limitParam) || 50)) : undefined;

  const scores = await listLeadScores(limit);
  return apiSuccess(scores);
}
