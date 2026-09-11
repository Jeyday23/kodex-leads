import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { applyProposedBrainBundle } from "@/lib/growth/brain/store";
import { NOT_CONFIGURED_ERROR } from "@/lib/growth/brain/types";
import { proposedBundleSchema } from "@/lib/growth/brain/seed-from-website";

const applySchema = z.object({
  proposal: proposedBundleSchema,
});

/**
 * The only path in WS1 that persists a seed-from-website proposal. Requires
 * the caller to have already reviewed the proposal returned by POST
 * /api/growth/brain/seed (the confirmation step from the WS1 brief).
 */
export async function POST(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const parsed = applySchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid proposal payload.", 400);

  const result = await applyProposedBrainBundle(parsed.data.proposal);

  if (!result.ok && result.errors.length === 1 && result.errors[0] === NOT_CONFIGURED_ERROR) {
    return apiError(result.errors[0], 503);
  }

  return apiSuccess(result);
}
