import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { createMessagePillar, listMessagePillars } from "@/lib/growth/brain/store";

const pillarSchema = z.object({
  title: z.string().min(1).max(200),
  claim: z.string().min(1).max(500),
  proof: z.string().min(1).max(500),
});

export async function GET(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;
  return apiSuccess(await listMessagePillars());
}

export async function POST(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const parsed = pillarSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid message pillar payload.", 400);

  const result = await createMessagePillar(parsed.data);
  return result.ok ? apiSuccess(result, { status: 201 }) : apiError(result.error, 503);
}
