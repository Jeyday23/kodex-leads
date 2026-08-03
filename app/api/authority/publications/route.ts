import { apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { listPublications } from "@/lib/authority/autonomous-ranking";

export async function GET(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;
  return apiSuccess(await listPublications());
}
