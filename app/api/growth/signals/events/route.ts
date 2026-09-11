import { apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { listSignalEvents } from "@/lib/growth/signals/store";

export async function GET(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? undefined;
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Math.min(200, Math.max(1, Number(limitParam) || 50)) : undefined;

  const events = await listSignalEvents({ type, limit });
  return apiSuccess(events);
}
