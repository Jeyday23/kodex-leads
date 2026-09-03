import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { rateLimit } from "@/lib/authority/rate-limit";
import { getAutopilotStatus, runAutopilot } from "@/lib/authority/autonomous-ranking";
import { runAutonomyPreflight } from "@/lib/authority/preflight";
import { discoverKodexLeads } from "@/lib/seo/lead-discovery";
import { createLeadWorkPackages } from "@/lib/seo/lead-work-packages";

const schema = z.object({ preflight: z.boolean().optional() });

export async function POST(request: Request) {
  // Signed-in administrators, or Render cron jobs presenting CRON_SECRET.
  const auth = await requireAuthorityApi(request, { allowCron: true });
  if (!auth.ok) return auth.response;
  const limit = rateLimit(`autopilot:${auth.actor}`, 2, 10 * 60_000);
  if (!limit.allowed) return apiError(`Autopilot is rate limited. Retry after ${limit.retryAfterSeconds}s.`, 429);

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("Invalid autopilot payload.", 400);

  if (parsed.data.preflight) {
    return apiSuccess(await runAutonomyPreflight());
  }

  const status = await getAutopilotStatus();
  if (status.mode === "off") {
    return apiError("Autopilot is OFF. Enable a mode before running.", 409);
  }

  const leadDiscovery = await discoverKodexLeads();
  const leadPackages = await createLeadWorkPackages(leadDiscovery.leads);
  const result = await runAutopilot({ actor: auth.actor });
  return apiSuccess({
    ...result,
    leadDiscovery,
    leadPackages: {
      queuedForApproval: leadPackages.queued.length,
      errors: leadPackages.errors,
      approvalQueue: "/admin/authority/outreach",
    },
  });
}
