// WS3 outreach copy drafting. Uses generateText() + renderBrainContext() to
// produce channel-appropriate copy; falls back to an honest templated draft
// with a `skipped` marker when no LLM provider is configured, so a queued
// task always carries something a human can read and edit, never a blank.

import { generateText, getGrowthLlmStatus } from "@/lib/growth/llm";
import { renderBrainContext, type BrainContextBundle, type GrowthChannel } from "@/lib/growth/context";

export interface DraftBrief {
  companyName: string;
  personName?: string;
  personTitle?: string;
  signalSummary: string;
  calendarLink?: string;
}

export interface DraftResult {
  copy: string;
  source: "llm" | "template";
  skipped: boolean;
  detail?: string;
}

function templateChannelCopy(channel: GrowthChannel, brief: DraftBrief, bundle: BrainContextBundle): string {
  const contact = brief.personName ? `${brief.personName}${brief.personTitle ? ` (${brief.personTitle})` : ""}` : "there";
  const cta = brief.calendarLink ? ` If useful, book time here: ${brief.calendarLink}.` : "";

  if (channel === "email") {
    return `Subject: A signal worth flagging at ${brief.companyName}\n\nHi ${contact},\n\n${brief.signalSummary} ${bundle.profile.oneLineDescription}${cta}`;
  }

  if (channel === "linkedin") {
    return `Hi ${contact}, ${brief.signalSummary.replace(/\.$/, "")} - thought it was worth a quick note. ${bundle.profile.oneLineDescription}${cta}`;
  }

  return `${brief.signalSummary} ${bundle.profile.oneLineDescription}${cta}`;
}

/**
 * Drafts copy for a sequence step. Only calls the LLM when a provider is
 * configured (checked via getGrowthLlmStatus, never assumed); the templated
 * fallback is always honest about the fact that it is a template by setting
 * `source: "template"` and `skipped: true`.
 */
export async function draftSequenceCopy(
  channel: GrowthChannel,
  brief: DraftBrief,
  bundle: BrainContextBundle,
): Promise<DraftResult> {
  const status = getGrowthLlmStatus();
  if (!status.configured) {
    return {
      copy: templateChannelCopy(channel, brief, bundle),
      source: "template",
      skipped: true,
      detail: "No LLM provider configured; this is a templated draft.",
    };
  }

  const context = renderBrainContext(bundle, { channel });
  const generation = await generateText({
    system: `${context}\n\nWrite a short outreach draft for the ${channel} channel following the voice rules above exactly. Reference the specific signal given. Never invent facts.`,
    prompt: `Company: ${brief.companyName}\nContact: ${brief.personName ?? "unknown"} (${brief.personTitle ?? "unknown title"})\nSignal: ${brief.signalSummary}\n${brief.calendarLink ? `Calendar link to offer: ${brief.calendarLink}` : ""}`,
    maxTokens: 400,
  });

  if (generation.status !== "generated" || generation.text.trim().length === 0) {
    return {
      copy: templateChannelCopy(channel, brief, bundle),
      source: "template",
      skipped: true,
      detail: generation.detail ?? "LLM generation did not return usable text; falling back to a template.",
    };
  }

  return { copy: generation.text.trim(), source: "llm", skipped: false };
}
