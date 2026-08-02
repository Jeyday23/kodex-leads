import { runAuthorityMonitoringCycle } from "@/lib/authority/monitoring";
import { apiError, apiSuccess } from "@/lib/authority/api";

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return apiError("CRON_SECRET is not configured", 503);
  }
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return apiError("Unauthorized", 401);
  }

  const result = await runAuthorityMonitoringCycle({ promptLimit: 5 });
  return apiSuccess(result);
}
