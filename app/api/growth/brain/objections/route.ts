import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { createObjection, listObjections } from "@/lib/growth/brain/store";

const objectionSchema = z.object({
  objection: z.string().min(1).max(500),
  response: z.string().min(1).max(1000),
});

export async function GET(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;
  return apiSuccess(await listObjections());
}

export async function POST(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const parsed = objectionSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid objection payload.", 400);

  const result = await createObjection(parsed.data);
  return result.ok ? apiSuccess(result, { status: 201 }) : apiError(result.error, 503);
}
