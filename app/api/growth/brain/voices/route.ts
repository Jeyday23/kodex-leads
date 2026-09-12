import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { listChannelVoiceRows, upsertChannelVoice } from "@/lib/growth/brain/store";

const voiceSchema = z.object({
  channel: z.enum(["linkedin", "x", "reddit", "articles", "email"]),
  tone: z.string().min(1).max(300),
  rules: z.array(z.string().min(1)).max(20).optional(),
  bannedTerms: z.array(z.string().min(1)).max(30).optional(),
  maxLength: z.number().int().min(1).max(20000),
  example: z.string().min(1).max(2000),
});

export async function GET(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;
  return apiSuccess(await listChannelVoiceRows());
}

/** Upserts the voice for the given channel (unique per channel). */
export async function POST(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const parsed = voiceSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid channel voice payload.", 400);

  const result = await upsertChannelVoice(parsed.data);
  return result.ok ? apiSuccess(result, { status: 201 }) : apiError(result.error, 503);
}
