// Reddit publishing (WS4). Section 5 rule 5 is absolute: Reddit is never
// posted automatically by code (community-ban risk). This module NEVER calls
// fetch or the Reddit API - it only records a URL a human pasted in after
// replying manually, and flips the draft's status to `published`.
// Grep-testable: tests/growth-channels.test.ts stubs global.fetch to throw
// and asserts this module never reaches it.

import { recordManualPublish } from "../store";

export interface RedditPublishResult {
  ok: boolean;
  error?: string;
}

/**
 * Records that a human has manually posted a Reddit reply drafted by this
 * system and pasted back the resulting comment URL. Does not call Reddit or
 * any network API.
 */
export async function recordRedditPublish(draftId: string, publishedUrl: string, actor?: string): Promise<RedditPublishResult> {
  if (!publishedUrl || !/^https?:\/\//i.test(publishedUrl)) {
    return { ok: false, error: "A published URL is required to record a manual Reddit publish." };
  }
  return recordManualPublish(draftId, publishedUrl, actor);
}
