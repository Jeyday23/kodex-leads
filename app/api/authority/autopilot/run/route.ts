import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { rateLimit } from "@/lib/authority/rate-limit";
import { controlledAcceptanceTest, runAutopilot } from "@/lib/authority/autonomous-ranking";

const schema = z.object({
  acceptance: z.boolean().optional(),
  modeOverride: z.enum(["off", "draft_only", "guarded", "controlled"]).optional(),
});

export async function POST(request: Request) {
  const auth = await requireAuthorityApi(request, { allowCron: true });
  if (!auth.ok) return auth.response;
  const limit = rateLimit(`autopilot:${auth.actor}`, 2, 10 * 60_000);
  if (!limit.allowed) return apiError(`Autopilot is rate limited. Retry after ${limit.retryAfterSeconds}s.`, 429);
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("Invalid autopilot payload.", 400);
  const result = parsed.data.acceptance
    ? await controlledAcceptanceTest(auth.actor)
    : await runAutopilot({ actor: auth.actor, modeOverride: parsed.data.modeOverride });
  return apiSuccess(result);
}
