import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { getBrainContextBundle } from "@/lib/growth/context";
import { draftForChannel } from "@/lib/growth/channels/draft";
import { createChannelDraft, listChannelDrafts } from "@/lib/growth/channels/store";

const draftChannelSchema = z.enum(["linkedin", "x", "reddit", "article_brief", "email"]);
const statusSchema = z.enum(["draft", "approved", "scheduled", "published", "rejected"]);

const createSchema = z.object({
  channel: draftChannelSchema,
  topic: z.string().min(3).max(500),
  context: z.string().max(2000).optional(),
  targetQuery: z.string().max(300).optional(),
  sourceRef: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const channelParam = url.searchParams.get("channel");
  const statusParam = url.searchParams.get("status");
  const channel = channelParam ? draftChannelSchema.safeParse(channelParam) : null;
  const status = statusParam ? statusSchema.safeParse(statusParam) : null;

  const result = await listChannelDrafts({
    channel: channel?.success ? channel.data : undefined,
    status: status?.success ? status.data : undefined,
  });
  return apiSuccess({ items: result.items, configured: result.configured });
}

export async function POST(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return apiError("Invalid draft request.", 400);

  const bundle = await getBrainContextBundle();
  const result = await draftForChannel(
    parsed.data.channel,
    { topic: parsed.data.topic, context: parsed.data.context, targetQuery: parsed.data.targetQuery, sourceRef: parsed.data.sourceRef },
    bundle,
  );

  if (result.status === "skipped") {
    return apiSuccess({ status: "skipped", reason: result.reason }, { status: 200 });
  }

  const record = await createChannelDraft({
    channel: result.channel,
    title: result.title,
    body: result.body,
    sourceRef: { ...result.sourceRef, opportunityId: result.opportunityId ?? null },
    voiceSnapshot: result.voiceSnapshot,
    quality: result.quality,
    rationale: result.rationale,
    createdBy: auth.actor,
  });

  return apiSuccess({ status: "drafted", record, draft: result }, { status: 201 });
}
