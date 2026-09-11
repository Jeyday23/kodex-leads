import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { getSequence } from "@/lib/growth/sequences/store";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const sequence = await getSequence(id);
  if (!sequence) return apiError("Sequence not found.", 404);
  return apiSuccess(sequence);
}
