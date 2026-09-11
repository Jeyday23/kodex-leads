import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { createCompetitor, listCompetitors } from "@/lib/growth/brain/store";

const competitorSchema = z.object({
  name: z.string().min(1).max(200),
  domain: z.string().min(1).max(300).optional(),
  summary: z.string().max(1000).optional(),
});

export async function GET(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;
  return apiSuccess(await listCompetitors());
}

export async function POST(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const parsed = competitorSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid competitor payload.", 400);

  const result = await createCompetitor(parsed.data);
  return result.ok ? apiSuccess(result, { status: 201 }) : apiError(result.error, 503);
}
