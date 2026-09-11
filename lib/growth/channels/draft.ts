// Drafts channel content for WS4's five channels using the shared LLM
// module and Brain context. Every draft is created in `draft` status only -
// nothing here approves, schedules, or publishes anything (section 5 rule 5).
//
// Must not import "server-only": scripts/run-growth-planner.ts reaches this
// module under plain tsx.

import { generateText } from "@/lib/growth/llm";
import {
  getChannelVoice,
  renderBrainContext,
  type BrainContextBundle,
  type ChannelVoice,
  type GrowthChannel,
} from "@/lib/growth/context";
import { evaluateChannelDraft, type QualityGateResult } from "./quality-gate";
import { createOpportunity } from "@/lib/authority/opportunities";
import { getSeoSupabase } from "@/lib/seo/db";

/** The five draftable channels. `article_brief` maps to the bundle's "articles" voice. */
export type DraftChannel = "linkedin" | "x" | "reddit" | "article_brief" | "email";

function voiceChannelFor(channel: DraftChannel): GrowthChannel {
  return channel === "article_brief" ? "articles" : channel;
}

export interface DraftBrief {
  /** What the draft should be about, e.g. a Reddit thread title, a signal, or a topic. */
  topic: string;
  /** Extra context to fold into the prompt (a Reddit thread snippet, a signal's evidence, etc). */
  context?: string;
  /** Free-form provenance recorded on the draft row (source_ref). */
  sourceRef?: Record<string, unknown>;
  /** article_brief only: the query the resulting article should target. */
  targetQuery?: string;
}

export interface DraftedChannelContent {
  status: "drafted";
  channel: DraftChannel;
  title: string | null;
  body: string;
  voiceSnapshot: ChannelVoice;
  quality: QualityGateResult;
  rationale: string;
  sourceRef: Record<string, unknown>;
  /** article_brief only: the id of the authority_opportunities row created for this brief, if Supabase is configured. */
  opportunityId?: string;
}

export interface SkippedChannelContent {
  status: "skipped";
  channel: DraftChannel;
  reason: string;
}

export type DraftForChannelResult = DraftedChannelContent | SkippedChannelContent;

function systemPromptFor(channel: DraftChannel, bundle: BrainContextBundle): string {
  const voice = getChannelVoice(bundle, voiceChannelFor(channel));
  const brainContext = renderBrainContext(bundle, { channel: voiceChannelFor(channel) });
  const channelInstructions: Record<DraftChannel, string> = {
    linkedin: "Write a single LinkedIn post. Return only the post text, no title, no hashtags unless the voice rules allow them.",
    x: "Write a single X (Twitter) post. Return only the post text, fitting the channel's character limit.",
    reddit: "Write a single Reddit reply answering the linked thread's actual question, per the voice's disclosure rule. Return only the reply text.",
    article_brief:
      "Produce an article brief as plain text with these labelled sections, in this order: " +
      "Title: <title>\nTarget query: <query>\nOutline:\n- <point>\n- <point>\nSources needed:\n- <source>",
    email: "Write a single short outbound email body referencing the specific signal in the context. Return only the email body.",
  };

  return [
    brainContext,
    "",
    `You are drafting content for the ${channel} channel. ${channelInstructions[channel]}`,
    `Voice rules: ${voice.rules.join(" ")}`,
    `Never use the em dash character or any of: ${voice.bannedTerms.filter((term) => term !== "—").join(", ")}.`,
    "Every regulatory claim (naming a framework and an obligation) needs a short not-legal-advice disclaimer.",
    "Never fabricate facts, sources, or endorsements. Only draft content; you are not publishing or sending anything.",
  ].join("\n");
}

function userPromptFor(brief: DraftBrief, failureReasons?: string[]): string {
  const lines = [`Topic: ${brief.topic}`];
  if (brief.context) lines.push(`Context: ${brief.context}`);
  if (brief.targetQuery) lines.push(`Target query: ${brief.targetQuery}`);
  if (failureReasons && failureReasons.length > 0) {
    lines.push(
      "The previous draft failed the quality gate for these reasons - fix every one of them in this new draft:",
      ...failureReasons.map((reason) => `- ${reason}`),
    );
  }
  return lines.join("\n");
}

interface ParsedArticleBrief {
  title: string | null;
  body: string;
}

function parseArticleBrief(text: string): ParsedArticleBrief {
  const titleMatch = text.match(/^Title:\s*(.+)$/m);
  return { title: titleMatch ? titleMatch[1].trim() : null, body: text.trim() };
}

/**
 * Drafts content for one channel using the shared LLM module and the Brain
 * context, scoped to that channel's voice. Runs the quality gate on the
 * result; on failure, regenerates exactly once with the failure reasons fed
 * back into the prompt. Returns `skipped` (never a fake draft) when no LLM
 * provider is configured.
 */
export async function draftForChannel(
  channel: DraftChannel,
  brief: DraftBrief,
  bundle: BrainContextBundle,
): Promise<DraftForChannelResult> {
  const voice = getChannelVoice(bundle, voiceChannelFor(channel));
  const system = systemPromptFor(channel, bundle);

  const firstAttempt = await generateText({ system, prompt: userPromptFor(brief) });
  if (firstAttempt.status === "skipped") {
    return { status: "skipped", channel, reason: firstAttempt.detail ?? "No LLM provider configured." };
  }
  if (firstAttempt.status === "failed") {
    return { status: "skipped", channel, reason: firstAttempt.detail ?? "LLM generation failed." };
  }

  let bodyText = firstAttempt.text.trim();
  let quality = evaluateChannelDraft(bodyText, voice);

  if (!quality.pass) {
    const retry = await generateText({ system, prompt: userPromptFor(brief, quality.reasons) });
    if (retry.status === "generated") {
      const retryBody = retry.text.trim();
      const retryQuality = evaluateChannelDraft(retryBody, voice);
      bodyText = retryBody;
      quality = retryQuality;
    }
    // If the retry was skipped/failed, keep the first attempt's text and
    // quality result rather than discarding a real draft for a transient
    // provider failure on the retry.
  }

  const parsed = channel === "article_brief" ? parseArticleBrief(bodyText) : { title: null, body: bodyText };
  const sourceRef = brief.sourceRef ?? {};

  let opportunityId: string | undefined;
  if (channel === "article_brief") {
    if (getSeoSupabase()) {
      const created = await createOpportunity({
        query: brief.targetQuery ?? brief.topic,
        framework: "EU AI Act",
        actor: "growth-channel-planner",
      });
      if (created.id) opportunityId = created.id;
    }
    // When Supabase is not configured, the brief itself (title/outline/
    // target query/sources-needed) is the stored artifact - it is returned
    // in the result and persisted as a growth_channel_drafts row by the
    // caller, so nothing is lost.
  }

  return {
    status: "drafted",
    channel,
    title: parsed.title,
    body: parsed.body,
    voiceSnapshot: voice,
    quality,
    rationale: `Drafted from topic "${brief.topic}" using the ${channel} voice.`,
    sourceRef,
    opportunityId,
  };
}
