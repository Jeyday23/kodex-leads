import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { createKeyword, listKeywords } from "@/lib/growth/brain/store";

const keywordSchema = z.object({
  term: z.string().min(1).max(200),
  type: z.enum(["product", "problem", "competitor"]),
  language: z.string().min(2).max(12).optional(),
});

export async function GET(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;
  return apiSuccess(await listKeywords());
}

export async function POST(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const parsed = keywordSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid keyword payload.", 400);

  const result = await createKeyword(parsed.data);
  return result.ok ? apiSuccess(result, { status: 201 }) : apiError(result.error, 503);
}
