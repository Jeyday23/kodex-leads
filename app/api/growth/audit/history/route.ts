import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { getSiteUrl } from "@/lib/seo/config";
import { getAllAuditTrends, getAuditTrend, type AuditKind } from "@/lib/growth/audit/history";

const AUDIT_KINDS = ["lighthouse", "technical", "geo", "site_files"] as const;

const querySchema = z.object({
  url: z.string().url().optional(),
  kind: z.enum(AUDIT_KINDS).optional(),
  device: z.enum(["mobile", "desktop"]).optional(),
  days: z.coerce.number().int().min(1).max(365).optional(),
});

export async function GET(request: Request) {
  const auth = await requireAuthorityApi(request, { allowCron: true });
  if (!auth.ok) return auth.response;

  const params = new URL(request.url).searchParams;
  const parsed = querySchema.safeParse({
    url: params.get("url") ?? undefined,
    kind: params.get("kind") ?? undefined,
    device: params.get("device") ?? undefined,
    days: params.get("days") ?? undefined,
  });
  if (!parsed.success) return apiError("Invalid query parameters.", 400);

  const url = parsed.data.url ?? getSiteUrl();
  const days = parsed.data.days ?? 30;

  if (parsed.data.kind) {
    const kind: AuditKind = parsed.data.kind;
    const device = kind === "lighthouse" ? (parsed.data.device ?? "mobile") : null;
    const trend = await getAuditTrend(url, kind, days, device);
    return apiSuccess({ url, kind, device, days, trend });
  }

  const trends = await getAllAuditTrends(url, days);
  return apiSuccess({ url, days, trends });
}
