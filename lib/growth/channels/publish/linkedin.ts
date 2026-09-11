// LinkedIn publishing (WS4). Section 5 rule 5 is absolute: no LinkedIn
// session automation (ToS/ban risk on the founder's own account). This
// module NEVER calls fetch or any LinkedIn API - it only records a URL a
// human pasted in after posting manually, and flips the draft's status to
// `published`. Grep-testable: tests/growth-channels.test.ts stubs
// global.fetch to throw and asserts this module never reaches it.

import { recordManualPublish } from "../store";

export interface LinkedInPublishResult {
  ok: boolean;
  error?: string;
}

/**
 * Records that a human has manually posted a LinkedIn draft and pasted back
 * the resulting post URL. Does not call LinkedIn or any network API.
 */
export async function recordLinkedInPublish(draftId: string, publishedUrl: string, actor?: string): Promise<LinkedInPublishResult> {
  if (!publishedUrl || !/^https?:\/\//i.test(publishedUrl)) {
    return { ok: false, error: "A published URL is required to record a manual LinkedIn publish." };
  }
  return recordManualPublish(draftId, publishedUrl, actor);
}
