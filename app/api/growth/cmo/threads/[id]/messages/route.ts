import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { runCmoAgentTurn } from "@/lib/growth/cmo/agent";
import { listCmoActions, listCmoMessages } from "@/lib/growth/cmo/store";

const messageSchema = z.object({
  content: z.string().min(1).max(4000),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const threadId = (await params).id;
  const [messages, actions] = await Promise.all([listCmoMessages(threadId), listCmoActions(threadId)]);
  return apiSuccess({ messages, actions });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const parsed = messageSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid CMO message payload.", 400);

  const threadId = (await params).id;
  const result = await runCmoAgentTurn({ threadId, content: parsed.data.content, actor: auth.actor });
  if (!result.userMessage && result.storageError) return apiError(result.storageError, 503);
  return apiSuccess(result, { status: 201 });
}
