import { apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { listOutreachTasks } from "@/lib/growth/sequences/store";

export async function GET(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;
  const tasks = await listOutreachTasks(status);
  return apiSuccess(tasks);
}
