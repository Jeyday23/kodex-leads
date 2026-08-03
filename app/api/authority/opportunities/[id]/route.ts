import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { getOpportunity } from "@/lib/authority/opportunities";

const patchSchema = z.object({
  status: z.string().optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;
  const opportunity = await getOpportunity((await params).id);
  if (!opportunity) return apiError("Opportunity not found.", 404);
  return apiSuccess(opportunity);
}

export async function PATCH(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid opportunity update.", 400);
  return apiSuccess({ accepted: true });
}
