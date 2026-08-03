import { z } from "zod";
import { apiError, apiSuccess, paginationFromUrl } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { createOpportunity, listOpportunities } from "@/lib/authority/opportunities";
import { filtersFromUrl } from "@/lib/authority/response";

const opportunitySchema = z.object({
  query: z.string().min(8).max(500),
  framework: z.string().max(120).optional(),
  topicCluster: z.string().max(120).optional(),
  intent: z.string().max(120).optional(),
  country: z.string().max(8).optional(),
  language: z.string().max(12).optional(),
});

export async function GET(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const pagination = paginationFromUrl(request.url);
  const result = await listOpportunities({ ...filtersFromUrl(request.url), ...pagination });
  return apiSuccess(result.items, { metadata: { pagination: { ...pagination, total: result.total } } });
}

export async function POST(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const parsed = opportunitySchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid opportunity payload.", 400);

  const result = await createOpportunity({ ...parsed.data, actor: auth.actor });
  return apiSuccess(result, { status: 201 });
}
