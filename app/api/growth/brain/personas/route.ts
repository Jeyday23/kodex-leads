import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { createPersona, listPersonas } from "@/lib/growth/brain/store";

const personaSchema = z.object({
  name: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  goals: z.array(z.string().min(1)).max(20).optional(),
  pains: z.array(z.string().min(1)).max(20).optional(),
  triggers: z.array(z.string().min(1)).max(20).optional(),
});

export async function GET(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;
  return apiSuccess(await listPersonas());
}

export async function POST(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const parsed = personaSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid persona payload.", 400);

  const result = await createPersona(parsed.data);
  return result.ok ? apiSuccess(result, { status: 201 }) : apiError(result.error, 503);
}
