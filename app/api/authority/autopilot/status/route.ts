import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { getAutopilotStatus, updateAutopilotMode } from "@/lib/authority/autonomous-ranking";
import { z } from "zod";

const schema = z.object({ mode: z.enum(["off", "draft_only", "guarded", "controlled"]) });

function hasControlAccess(request: Request): boolean {
  const configured = process.env.AUTOPILOT_CONTROL_SECRET;
  if (!configured) return false;
  return request.headers.get("x-kodex-control-secret") === configured;
}

export async function GET(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;
  return apiSuccess(await getAutopilotStatus());
}

export async function PATCH(request: Request) {
  if (!hasControlAccess(request)) {
    return apiError("Private autopilot control key required.", 403);
  }
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("Invalid autopilot mode.", 400);
  const result = await updateAutopilotMode(parsed.data.mode, auth.actor);
  if (!result.ok) return apiError(result.error ?? "Mode update failed.", 400);
  return apiSuccess(result);
}
