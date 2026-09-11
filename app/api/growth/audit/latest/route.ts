import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { getSiteUrl } from "@/lib/seo/config";
import { getLatestAudits } from "@/lib/growth/audit/history";

const querySchema = z.object({ url: z.string().url().optional() });

export async function GET(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const params = new URL(request.url).searchParams;
  const parsed = querySchema.safeParse({ url: params.get("url") ?? undefined });
  if (!parsed.success) return apiError("Invalid url query parameter.", 400);

  const url = parsed.data.url ?? getSiteUrl();
  const audits = await getLatestAudits(url);
  return apiSuccess({ url, audits });
}
