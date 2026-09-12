import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { createCmoThread, listCmoThreads } from "@/lib/growth/cmo/store";

const createSchema = z.object({
  title: z.string().min(1).max(200).optional(),
});

export async function GET(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const result = await listCmoThreads();
  return apiSuccess(result);
}

export async function POST(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("Invalid CMO thread payload.", 400);

  const result = await createCmoThread(parsed.data.title ?? "CMO thread", auth.actor);
  if (!result.ok) return apiError(result.error, result.configured ? 500 : 503);
  return apiSuccess(result.item, { status: 201 });
}
