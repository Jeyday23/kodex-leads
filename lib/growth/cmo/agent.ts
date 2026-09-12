import { generateText } from "@/lib/growth/llm";
import { callAllCmoReadTools, proposeBrainUpdate, proposeChannelDraft, proposeSignalRun, proposeSiteAuditRun } from "./tools";
import { persistCmoActionProposal, type CmoActionProposal } from "./actions";
import { addCmoMessage, type CmoAction, type CmoMessage } from "./store";

export const CMO_AGENT_MAX_ROUNDS = 6;

export interface CmoAgentTurnInput {
  threadId: string;
  content: string;
  actor?: string;
}

export interface CmoAgentTurnResult {
  userMessage: CmoMessage | null;
  assistantMessage: CmoMessage | null;
  content: string;
  actions: CmoAction[];
  proposal: CmoActionProposal | null;
  roundsUsed: number;
  fallback: boolean;
  storageError?: string;
}

function inferProposal(content: string): CmoActionProposal | null {
  const lower = content.toLowerCase();
  if (/\b(draft|post|linkedin|reddit|tweet|x post|email)\b/.test(lower)) {
    const channel = lower.includes("reddit")
      ? "reddit"
      : lower.includes("x ") || lower.includes("tweet")
        ? "x"
        : lower.includes("email")
          ? "email"
          : lower.includes("article")
            ? "article_brief"
            : "linkedin";
    return proposeChannelDraft({ channel, topic: content });
  }
  if (/\b(audit|lighthouse|pagespeed|seo check)\b/.test(lower)) return proposeSiteAuditRun({});
  if (/\b(signal|signals|discover|scan)\b/.test(lower)) return proposeSignalRun({});
  if (/\b(brain|persona|keyword|pillar|competitor|voice)\b/.test(lower)) {
    return proposeBrainUpdate({ summary: content });
  }
  return null;
}

function fallbackReply(content: string, toolSummaries: string[], proposal: CmoActionProposal | null): string {
  const proposalLine = proposal
    ? `I prepared a proposal for approval: ${proposal.title}. I will not execute it unless you confirm it.`
    : "No write action is needed yet; I can propose drafts, audits, signal runs, or Brain updates when you ask.";
  return [
    "Here is the CMO readout from the Growth Engine.",
    "",
    toolSummaries.slice(0, 6).join("\n"),
    "",
    `Your ask: ${content}`,
    proposalLine,
  ].join("\n");
}

export async function runCmoAgentTurn(input: CmoAgentTurnInput): Promise<CmoAgentTurnResult> {
  const userStored = await addCmoMessage({ threadId: input.threadId, role: "user", content: input.content });
  const readResults = await callAllCmoReadTools();
  const proposal = inferProposal(input.content);
  const toolSummaries = readResults.map((result) => {
    const availability = result.available ? "available" : "not available";
    const note = result.note ? ` (${result.note})` : "";
    return `- ${result.name}: ${availability}${note}`;
  });

  const system = [
    "You are the Kodex Growth CMO assistant.",
    "Use only the supplied tool summaries. Do not claim that a write happened.",
    "Mutating requests are proposals only and require separate confirmation.",
  ].join("\n");
  const prompt = [
    `User request: ${input.content}`,
    "",
    "Tool summaries:",
    toolSummaries.join("\n"),
    "",
    proposal ? `Prepared proposal: ${JSON.stringify(proposal)}` : "Prepared proposal: none",
    "Write a concise operator-facing answer.",
  ].join("\n");

  const generated = await generateText({ system, prompt, maxTokens: 700 });
  const fallback = generated.status !== "generated";
  const content = fallback ? fallbackReply(input.content, toolSummaries, proposal) : generated.text.trim();

  const assistantStored = await addCmoMessage({
    threadId: input.threadId,
    role: "assistant",
    content,
    metadata: {
      roundsUsed: 1,
      fallback,
      proposal: proposal ?? null,
    },
  });

  const actions: CmoAction[] = [];
  let storageError: string | undefined;
  if (proposal) {
    const persisted = await persistCmoActionProposal({
      threadId: input.threadId,
      messageId: assistantStored.ok ? assistantStored.item.id : null,
      proposal,
      actor: input.actor,
    });
    if (persisted.action) actions.push(persisted.action);
    if (persisted.error) storageError = persisted.error;
  }

  return {
    userMessage: userStored.ok ? userStored.item : null,
    assistantMessage: assistantStored.ok ? assistantStored.item : null,
    content,
    actions,
    proposal,
    roundsUsed: 1,
    fallback,
    storageError: storageError ?? (!userStored.ok ? userStored.error : !assistantStored.ok ? assistantStored.error : undefined),
  };
}
