import { apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { getBrainContextBundle } from "@/lib/growth/context";
import { runSignals } from "@/lib/growth/signals/run-signals";

/**
 * The only run/discover endpoint in this workstream, so it is also the only
 * one carrying allowCron: true (Render cron triggers this on a schedule).
 */
export async function POST(request: Request) {
  const auth = await requireAuthorityApi(request, { allowCron: true });
  if (!auth.ok) return auth.response;

  const bundle = await getBrainContextBundle();
  const result = await runSignals(bundle);
  return apiSuccess(result);
}
