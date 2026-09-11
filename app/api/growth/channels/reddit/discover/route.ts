import { apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { getBrainContextBundle } from "@/lib/growth/context";
import { discoverRedditThreads } from "@/lib/growth/channels/reddit-discovery";
import { saveRedditOpportunities } from "@/lib/growth/channels/store";

const DEFAULT_SUBREDDITS = ["eutaxation", "gdpr", "artificial", "cybersecurity"];

/** Read/discover run: allowCron is appropriate here (Render's scheduled job triggers discovery). */
export async function POST(request: Request) {
  const auth = await requireAuthorityApi(request, { allowCron: true });
  if (!auth.ok) return auth.response;

  let subreddits = DEFAULT_SUBREDDITS;
  try {
    const body = (await request.json()) as { subreddits?: unknown };
    if (Array.isArray(body?.subreddits) && body.subreddits.every((entry) => typeof entry === "string")) {
      subreddits = body.subreddits as string[];
    }
  } catch {
    // No body, or non-JSON body: use the defaults.
  }

  const bundle = await getBrainContextBundle();
  const threads = await discoverRedditThreads(bundle.keywords, { subreddits });
  const saved = await saveRedditOpportunities(threads);

  return apiSuccess({ found: threads.length, saved });
}
