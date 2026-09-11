import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { getChannelSettings, updateChannelSettings } from "@/lib/growth/channels/store";

const draftChannelSchema = z.enum(["linkedin", "x", "reddit", "article_brief", "email"]);

const putSchema = z.object({
  channel: draftChannelSchema,
  enabled: z.boolean().optional(),
  weeklyTarget: z.number().int().min(0).max(500).optional(),
  autoDraft: z.boolean().optional(),
});

export async function GET(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const settings = await getChannelSettings();
  return apiSuccess(settings);
}

export async function PUT(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const parsed = putSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid channel settings payload.", 400);

  const { channel, ...patch } = parsed.data;
  const result = await updateChannelSettings(channel, patch);
  if (!result.ok) return apiError(result.error ?? "Could not update channel settings.", 409);
  return apiSuccess({ channel, ...patch });
}
