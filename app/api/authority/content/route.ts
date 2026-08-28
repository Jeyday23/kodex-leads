import { z } from "zod";
import { apiError, apiSuccess, paginationFromUrl } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { createContentAsset, listContentAssets } from "@/lib/authority/autonomous-ranking";

const schema = z.object({
  targetQuery: z.string().min(8).max(500),
  framework: z.string().max(120).optional(),
  jurisdiction: z.string().max(120).optional(),
  contentType: z.string().max(120).optional(),
});

export async function GET(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;
  const { limit } = paginationFromUrl(request.url);
  return apiSuccess(await listContentAssets(limit));
}

export async function POST(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid content asset payload.", 400);
  const result = await createContentAsset({ ...parsed.data, actor: auth.actor });
  if (!result.ok) return apiError(result.error ?? "Content asset was not created.", 400);
  return apiSuccess(result.asset, { status: 201 });
}
