import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { createMonitoringPrompt, listMonitoringPrompts, updateMonitoringPrompt } from "@/lib/authority/store";

const promptSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().min(2).max(140).optional(),
  prompt: z.string().min(10).max(2000).optional(),
  promptGroup: z.string().min(2).max(120).optional(),
  searchMode: z.string().min(2).max(80).optional(),
  country: z.string().min(2).max(8).optional(),
  language: z.string().min(2).max(12).optional(),
  active: z.boolean().optional(),
});

export async function GET(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;
  return apiSuccess(await listMonitoringPrompts());
}

export async function POST(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const parsed = promptSchema.required({ label: true, prompt: true }).safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid prompt payload.", 400);

  const result = await createMonitoringPrompt(parsed.data);
  return result.ok ? apiSuccess(result, { status: 201 }) : apiError(result.error ?? "Prompt was not created.", 503);
}

export async function PATCH(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const parsed = promptSchema.required({ id: true }).safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid prompt payload.", 400);

  const { id, ...updates } = parsed.data;
  const result = await updateMonitoringPrompt(id, updates);
  return result.ok ? apiSuccess(result) : apiError(result.error ?? "Prompt was not updated.", 503);
}
