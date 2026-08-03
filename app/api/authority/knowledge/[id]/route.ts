import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { checkKnowledgeSource, getKnowledgeSource, verifyKnowledgeSource } from "@/lib/authority/knowledge";

const schema = z.object({
  action: z.enum(["verify", "check"]),
  decision: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;
  const source = await getKnowledgeSource((await params).id);
  if (!source) return apiError("Knowledge source not found.", 404);
  return apiSuccess(source);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid knowledge payload.", 400);
  const id = (await params).id;
  const result = parsed.data.action === "check"
    ? await checkKnowledgeSource(id, auth.actor)
    : await verifyKnowledgeSource(id, auth.actor, parsed.data.decision ?? "verified", parsed.data.notes);
  if (!result.ok) return apiError(result.error ?? "Knowledge update failed.", 400);
  return apiSuccess(result);
}
