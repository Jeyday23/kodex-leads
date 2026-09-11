// Reddit thread discovery for WS4 (Okara's Reddit agent equivalent). Code
// never posts to Reddit - this module only finds candidate threads for a
// human to answer manually (see publish/reddit.ts and section 5 rule 5 of
// docs/growth-engine/00-HANDOFF-AND-BUILD-PLAN.md).
//
// Two request shapes are supported:
//  - OAuth client-credentials grant via oauth.reddit.com when
//    REDDIT_CLIENT_ID/REDDIT_CLIENT_SECRET are set (higher rate limits, works
//    for private/quarantined subreddits the app is approved for).
//  - The public, unauthenticated *.json listing endpoint otherwise.
// Both paths send a descriptive User-Agent (Reddit throttles or bans requests
// with a generic UA) and both are throttled to one request per second, since
// this module fans out across many (subreddit, keyword) pairs per run.
//
// This module must not import "server-only": scripts/run-growth-planner.ts
// reaches it under plain tsx.

import type { Keyword } from "@/lib/growth/context";

export interface RedditThread {
  id: string;
  subreddit: string;
  title: string;
  url: string;
  permalink: string;
  snippet: string;
  createdUtc: number;
  numComments: number;
  upvoteRatio: number | null;
  isSelf: boolean;
  flairText: string | null;
  hasStickiedTopAnswer: boolean;
}

export interface ScoredRedditThread {
  thread: RedditThread;
  matchedKeywords: string[];
  score: number;
  skip: boolean;
  skipReason: string | null;
}

export interface RedditDiscoveryOptions {
  subreddits: string[];
  now?: number;
  fetchImpl?: typeof fetch;
}

const DEFAULT_USER_AGENT = "kodex-growth-engine/1.0 (by /u/kodex-compliance; contact: growth@kodex-compliance.com)";
const THROTTLE_MS = 1000;

function userAgent(): string {
  return process.env.REDDIT_USER_AGENT || DEFAULT_USER_AGENT;
}

function isOAuthConfigured(): boolean {
  return Boolean(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET);
}

let lastRequestAt = 0;

/**
 * Throttles the caller to at most one Reddit request per second, regardless
 * of how many (subreddit, keyword) pairs are being searched in one run.
 */
async function throttle(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestAt;
  if (elapsed < THROTTLE_MS) {
    await new Promise((resolve) => setTimeout(resolve, THROTTLE_MS - elapsed));
  }
  lastRequestAt = Date.now();
}

interface RedditAccessToken {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: RedditAccessToken | null = null;

async function getAccessToken(fetchImpl: typeof fetch): Promise<string | null> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (cachedToken && cachedToken.expiresAt > Date.now() + 5_000) {
    return cachedToken.accessToken;
  }

  await throttle();
  const response = await fetchImpl("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": userAgent(),
    },
    body: "grant_type=client_credentials",
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return cachedToken.accessToken;
}

/**
 * Builds the search URL for one (subreddit, keyword) pair. Exported so the
 * exact query shape is testable without a network call.
 */
export function buildRedditSearchUrl(subreddit: string, keyword: string, useOAuth: boolean): string {
  const base = useOAuth ? "https://oauth.reddit.com" : "https://www.reddit.com";
  const params = new URLSearchParams({
    q: keyword,
    restrict_sr: "1",
    sort: "new",
    limit: "25",
    t: "month",
  });
  return `${base}/r/${encodeURIComponent(subreddit)}/search.json?${params.toString()}`;
}

interface RedditListingChildData {
  id?: string;
  subreddit?: string;
  title?: string;
  url?: string;
  permalink?: string;
  selftext?: string;
  created_utc?: number;
  num_comments?: number;
  upvote_ratio?: number;
  is_self?: boolean;
  link_flair_text?: string | null;
  stickied?: boolean;
}

interface RedditListingResponse {
  data?: {
    children?: Array<{ kind?: string; data?: RedditListingChildData }>;
  };
}

/**
 * Parses a Reddit `search.json` / `.json` listing response into
 * `RedditThread` records. Pure: takes already-fetched JSON, never calls
 * `fetch` itself, so it is directly testable against a recorded fixture.
 */
export function parseRedditListing(payload: unknown): RedditThread[] {
  const listing = payload as RedditListingResponse;
  const children = listing?.data?.children ?? [];
  const threads: RedditThread[] = [];

  for (const child of children) {
    const data = child?.data;
    if (!data?.id || !data.title || !data.subreddit) continue;
    const permalink = data.permalink ?? "";
    threads.push({
      id: data.id,
      subreddit: data.subreddit,
      title: data.title,
      url: data.url ?? `https://www.reddit.com${permalink}`,
      permalink: permalink ? `https://www.reddit.com${permalink}` : (data.url ?? ""),
      snippet: (data.selftext ?? "").slice(0, 400),
      createdUtc: data.created_utc ?? 0,
      numComments: data.num_comments ?? 0,
      upvoteRatio: typeof data.upvote_ratio === "number" ? data.upvote_ratio : null,
      isSelf: Boolean(data.is_self),
      flairText: data.link_flair_text ?? null,
      hasStickiedTopAnswer: Boolean(data.stickied),
    });
  }

  return threads;
}

const ACCEPTED_ANSWER_FLAIRS = ["solved", "answered", "resolved"];
// Words that signal a pure venting/rant post rather than a genuine question a
// Kodex reply could helpfully answer.
const VENTING_TERMS = ["rant", "vent", "furious", "fed up", "so pissed", "i hate", "i'm done with"];

function looksAcceptedOrVenting(thread: RedditThread): { skip: boolean; reason: string | null } {
  const flair = (thread.flairText ?? "").toLowerCase();
  if (ACCEPTED_ANSWER_FLAIRS.some((term) => flair.includes(term))) {
    return { skip: true, reason: "Thread flair indicates it already has an accepted answer." };
  }

  const haystack = `${thread.title} ${thread.snippet}`.toLowerCase();
  if (VENTING_TERMS.some((term) => haystack.includes(term))) {
    return { skip: true, reason: "Thread reads as venting rather than a question Kodex can helpfully answer." };
  }

  return { skip: false, reason: null };
}

/**
 * Scores a thread by keyword overlap, recency, and comment count:
 *
 *   score = 40 * (matchedKeywords / totalKeywords)
 *         + 40 * recencyFactor            (1.0 at 0 days old, decaying to 0 by 30 days)
 *         + 20 * min(numComments, 20) / 20
 *
 * The formula rewards threads that mention more of the Brain's tracked
 * keywords, are fresh (Reddit threads older than a few days rarely accept a
 * useful reply), and already have some engagement (a completely dead thread
 * is less likely to be seen). Pure: takes `now` as a parameter so it is
 * deterministic in tests.
 */
export function scoreRedditThread(thread: RedditThread, keywords: string[], now: number): ScoredRedditThread {
  const haystack = `${thread.title} ${thread.snippet}`.toLowerCase();
  const matchedKeywords = keywords.filter((keyword) => haystack.includes(keyword.toLowerCase()));
  const keywordScore = keywords.length > 0 ? (matchedKeywords.length / keywords.length) * 40 : 0;

  const ageDays = thread.createdUtc > 0 ? Math.max(0, (now / 1000 - thread.createdUtc) / 86_400) : 30;
  const recencyFactor = Math.max(0, 1 - ageDays / 30);
  const recencyScore = recencyFactor * 40;

  const commentScore = (Math.min(thread.numComments, 20) / 20) * 20;

  const score = Math.round((keywordScore + recencyScore + commentScore) * 100) / 100;

  const { skip, reason } = looksAcceptedOrVenting(thread);

  return {
    thread,
    matchedKeywords,
    score,
    skip,
    skipReason: reason,
  };
}

function keywordTerms(keywords: Keyword[]): string[] {
  return keywords.filter((keyword) => keyword.type === "product" || keyword.type === "problem").map((keyword) => keyword.term);
}

/**
 * Discovers candidate Reddit threads across the given subreddits, searching
 * once per (subreddit, keyword) pair, throttled to 1 request/sec. Returns
 * scored, non-skipped threads sorted by score descending. Never posts
 * anything - see publish/reddit.ts for the manual-only publish step.
 */
export async function discoverRedditThreads(
  keywords: Keyword[],
  options: RedditDiscoveryOptions,
): Promise<ScoredRedditThread[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const terms = keywordTerms(keywords);
  const now = options.now ?? Date.now();
  const useOAuth = isOAuthConfigured();
  const results = new Map<string, ScoredRedditThread>();

  for (const subreddit of options.subreddits) {
    for (const keyword of terms) {
      await throttle();

      const token = useOAuth ? await getAccessToken(fetchImpl) : null;
      const url = buildRedditSearchUrl(subreddit, keyword, Boolean(token));
      const headers: Record<string, string> = { "user-agent": userAgent() };
      if (token) headers.authorization = `Bearer ${token}`;

      let response: Response;
      try {
        response = await fetchImpl(url, { headers });
      } catch {
        continue;
      }
      if (!response.ok) continue;

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        continue;
      }

      for (const thread of parseRedditListing(payload)) {
        const scored = scoreRedditThread(thread, terms, now);
        const existing = results.get(thread.id);
        if (!existing || scored.score > existing.score) {
          results.set(thread.id, scored);
        }
      }
    }
  }

  return [...results.values()]
    .filter((result) => !result.skip)
    .sort((a, b) => b.score - a.score);
}
