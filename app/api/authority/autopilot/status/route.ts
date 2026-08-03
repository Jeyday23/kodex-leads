import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { getAutopilotStatus, updateAutopilotMode } from "@/lib/authority/autonomous-ranking";
import { z } from "zod";

const schema = z.object({ mode: z.enum(["off", "draft_only", "guarded", "controlled"]) });

export async function GET(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;
  return apiSuccess(await getAutopilotStatus());
}

export async function PATCH(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid autopilot mode.", 400);
  const result = await updateAutopilotMode(parsed.data.mode, auth.actor);
  if (!result.ok) return apiError(result.error ?? "Mode update failed.", 400);
  return apiSuccess(result);
}
