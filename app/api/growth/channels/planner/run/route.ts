import { apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { getBrainContextBundle } from "@/lib/growth/context";
import { runPlannerForToday } from "@/lib/growth/channels/planner";

/** Run endpoint: allowCron is appropriate here (Render's scheduled job triggers the daily planner). */
export async function POST(request: Request) {
  const auth = await requireAuthorityApi(request, { allowCron: true });
  if (!auth.ok) return auth.response;

  const bundle = await getBrainContextBundle();
  const summary = await runPlannerForToday(bundle);
  return apiSuccess(summary);
}
