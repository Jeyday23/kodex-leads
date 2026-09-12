import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { createInfluencer, listInfluencers } from "@/lib/growth/brain/store";

const influencerSchema = z.object({
  name: z.string().min(1).max(200),
  handle: z.string().min(1).max(200).optional(),
  platform: z.string().min(1).max(100).optional(),
  why: z.string().max(500).optional(),
});

export async function GET(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;
  return apiSuccess(await listInfluencers());
}

export async function POST(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const parsed = influencerSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid influencer payload.", 400);

  const result = await createInfluencer(parsed.data);
  return result.ok ? apiSuccess(result, { status: 201 }) : apiError(result.error, 503);
}
