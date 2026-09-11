// X (Twitter) publishing (WS4). Unlike LinkedIn and Reddit, X posting is not
// banned by section 5 rule 5, but it is still gated hard: this module posts
// only a draft whose status is already `approved` (a human decision made
// through drafts/[id]/decision), and only when all four X API credentials
// are configured. OAuth 1.0a request signing is implemented by hand with
// node:crypto - no HTTP client dependency is added for this.

import { createHmac, randomBytes } from "node:crypto";
import type { ChannelDraftRecord } from "../store";
import { markChannelDraftPublished } from "../store";

const X_TWEETS_URL = "https://api.x.com/2/tweets";

export interface XPublishStatus {
  configured: boolean;
  missing: string[];
}

const REQUIRED_ENV = ["X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_SECRET"] as const;

export function getXPublishStatus(): XPublishStatus {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  return { configured: missing.length === 0, missing: [...missing] };
}

/** RFC 3986 percent-encoding, which differs from encodeURIComponent for !*'() - required for a valid OAuth 1.0a signature base string. */
export function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!*'()]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

interface OAuth1Credentials {
  consumerKey: string;
  consumerSecret: string;
  token: string;
  tokenSecret: string;
}

/**
 * Builds an OAuth 1.0a `Authorization` header for a single request, signed
 * with HMAC-SHA1 per RFC 5849. Exported so the signing logic is unit
 * testable without a network call.
 */
export function buildOAuth1Header(
  method: string,
  url: string,
  credentials: OAuth1Credentials,
  extraParams: Record<string, string> = {},
  nonceOverride?: string,
  timestampOverride?: string,
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: credentials.consumerKey,
    oauth_nonce: nonceOverride ?? randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestampOverride ?? String(Math.floor(Date.now() / 1000)),
    oauth_token: credentials.token,
    oauth_version: "1.0",
  };

  const allParams = { ...extraParams, ...oauthParams };
  const paramString = Object.keys(allParams)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(allParams[key])}`)
    .join("&");

  const baseString = [method.toUpperCase(), percentEncode(url), percentEncode(paramString)].join("&");
  const signingKey = `${percentEncode(credentials.consumerSecret)}&${percentEncode(credentials.tokenSecret)}`;
  const signature = createHmac("sha1", signingKey).update(baseString).digest("base64");

  const headerParams: Record<string, string> = { ...oauthParams, oauth_signature: signature };
  const header = Object.keys(headerParams)
    .sort()
    .map((key) => `${percentEncode(key)}="${percentEncode(headerParams[key])}"`)
    .join(", ");

  return `OAuth ${header}`;
}

export interface XPublishResult {
  ok: boolean;
  configured: boolean;
  error?: string;
  publishedUrl?: string;
}

/**
 * Posts an approved X draft via the X API v2. Refuses any draft whose status
 * is not `approved` (an unapproved draft must never reach the network), and
 * reports `configured:false` cleanly instead of throwing when the four X
 * credentials are not set.
 */
export async function publishXDraft(draft: ChannelDraftRecord, fetchImpl: typeof fetch = fetch): Promise<XPublishResult> {
  if (draft.status !== "approved") {
    return { ok: false, configured: true, error: `Draft ${draft.id} is not approved; refusing to post to X.` };
  }

  const status = getXPublishStatus();
  if (!status.configured) {
    return { ok: false, configured: false, error: `X is not configured. Missing: ${status.missing.join(", ")}.` };
  }

  const credentials: OAuth1Credentials = {
    consumerKey: process.env.X_API_KEY!,
    consumerSecret: process.env.X_API_SECRET!,
    token: process.env.X_ACCESS_TOKEN!,
    tokenSecret: process.env.X_ACCESS_SECRET!,
  };

  const authorization = buildOAuth1Header("POST", X_TWEETS_URL, credentials);

  const response = await fetchImpl(X_TWEETS_URL, {
    method: "POST",
    headers: {
      authorization,
      "content-type": "application/json",
    },
    body: JSON.stringify({ text: draft.body }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return { ok: false, configured: true, error: `X API request failed (${response.status}): ${detail}` };
  }

  const data = (await response.json().catch(() => ({}))) as { data?: { id?: string } };
  const tweetId = data.data?.id;
  const publishedUrl = tweetId ? `https://x.com/i/web/status/${tweetId}` : undefined;

  const marked = await markChannelDraftPublished(draft.id);
  if (!marked.ok) {
    return { ok: false, configured: true, error: marked.error ?? "Posted to X but failed to update the draft record." };
  }

  return { ok: true, configured: true, publishedUrl };
}
