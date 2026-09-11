import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { listSignalConfigRows, upsertSignalConfig } from "@/lib/growth/brain/store";

const signalSchema = z.object({
  type: z.enum(["keyword", "competitor", "influencer", "own_brand", "hiring", "stack", "regulatory", "manual"]),
  enabled: z.boolean(),
  targets: z.array(z.string().min(1)).max(50).optional(),
});

export async function GET(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;
  return apiSuccess(await listSignalConfigRows());
}

/** Upserts the config for the given signal type (unique per type). */
export async function POST(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const parsed = signalSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid signal config payload.", 400);

  const result = await upsertSignalConfig(parsed.data);
  return result.ok ? apiSuccess(result, { status: 201 }) : apiError(result.error, 503);
}
