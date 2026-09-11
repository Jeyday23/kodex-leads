import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { getSiteUrl } from "@/lib/seo/config";
import { runSiteAudit } from "@/lib/growth/audit/run-audit";

const bodySchema = z.object({
  url: z.string().url().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAuthorityApi(request, { allowCron: true });
  if (!auth.ok) return auth.response;

  const raw = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(raw ?? {});
  if (!parsed.success) return apiError("Invalid request body.", 400);

  const url = parsed.data.url ?? getSiteUrl();
  const summary = await runSiteAudit(url);
  return apiSuccess(summary);
}
