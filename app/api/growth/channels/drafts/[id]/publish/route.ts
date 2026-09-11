import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { getChannelDraft } from "@/lib/growth/channels/store";
import { recordLinkedInPublish } from "@/lib/growth/channels/publish/linkedin";
import { recordRedditPublish } from "@/lib/growth/channels/publish/reddit";
import { publishXDraft } from "@/lib/growth/channels/publish/x";

const publishSchema = z.object({
  // Required for linkedin and reddit (the human pastes the URL after
  // posting manually); ignored for x, which posts itself via the API.
  publishedUrl: z.string().url().optional(),
});

/**
 * Dispatches to the channel-specific publisher. linkedin and reddit only
 * ever record a pasted URL (section 5 rule 5: no automated posting to
 * either). x posts through the X API v2 when configured and the draft is
 * already approved. article_brief and email have no publish action here -
 * an article brief becomes an authority opportunity at draft time, and email
 * sending belongs to WS3's sequence engine.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const draft = await getChannelDraft(id);
  if (!draft) return apiError("Draft not found.", 404);

  const parsed = publishSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("Invalid publish payload.", 400);

  if (draft.channel === "linkedin") {
    if (!parsed.data.publishedUrl) return apiError("publishedUrl is required to record a manual LinkedIn publish.", 400);
    const result = await recordLinkedInPublish(id, parsed.data.publishedUrl, auth.actor);
    if (!result.ok) return apiError(result.error ?? "Could not record the LinkedIn publish.", 409);
    return apiSuccess({ id, status: "published" });
  }

  if (draft.channel === "reddit") {
    if (!parsed.data.publishedUrl) return apiError("publishedUrl is required to record a manual Reddit publish.", 400);
    const result = await recordRedditPublish(id, parsed.data.publishedUrl, auth.actor);
    if (!result.ok) return apiError(result.error ?? "Could not record the Reddit publish.", 409);
    return apiSuccess({ id, status: "published" });
  }

  if (draft.channel === "x") {
    const result = await publishXDraft(draft);
    if (!result.configured) return apiError(result.error ?? "X is not configured.", 503);
    if (!result.ok) return apiError(result.error ?? "Could not publish to X.", 409);
    return apiSuccess({ id, status: "published", publishedUrl: result.publishedUrl });
  }

  return apiError(`Publishing is not supported for the ${draft.channel} channel.`, 400);
}
