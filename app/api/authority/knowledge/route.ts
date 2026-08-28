import { apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { listKnowledgeSources } from "@/lib/authority/knowledge";

export async function GET(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  return apiSuccess(await listKnowledgeSources({ framework: url.searchParams.get("framework"), search: url.searchParams.get("search") }));
}
