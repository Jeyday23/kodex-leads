import { getBrainContextBundle } from "@/lib/growth/context";
import { runSiteAudit } from "@/lib/growth/audit/run-audit";
import { draftForChannel, type DraftChannel } from "@/lib/growth/channels/draft";
import { createChannelDraft } from "@/lib/growth/channels/store";
import { runSignals } from "@/lib/growth/signals/run-signals";
import {
  createCmoAction,
  getCmoAction,
  updateCmoActionStatus,
  type CmoAction,
  type CmoActionStatus,
} from "./store";

export type CmoMutatingToolName =
  | "propose_channel_draft"
  | "propose_site_audit_run"
  | "propose_signal_run"
  | "propose_brain_update";

export const CMO_MUTATING_TOOL_NAMES: CmoMutatingToolName[] = [
  "propose_channel_draft",
  "propose_site_audit_run",
  "propose_signal_run",
  "propose_brain_update",
];

export interface CmoActionProposal {
  actionType: CmoMutatingToolName;
  title: string;
  payload: Record<string, unknown>;
  status: "proposed";
  executesImmediately: false;
}

export function buildCmoActionProposal(
  actionType: CmoMutatingToolName,
  title: string,
  payload: Record<string, unknown>,
): CmoActionProposal {
  return { actionType, title, payload, status: "proposed", executesImmediately: false };
}

export async function persistCmoActionProposal(input: {
  threadId: string;
  messageId?: string | null;
  proposal: CmoActionProposal;
  actor?: string;
}): Promise<{ proposal: CmoActionProposal; action: CmoAction | null; error?: string }> {
  const result = await createCmoAction({
    threadId: input.threadId,
    messageId: input.messageId,
    actionType: input.proposal.actionType,
    title: input.proposal.title,
    payload: input.proposal.payload,
    createdBy: input.actor,
  });

  if (!result.ok) return { proposal: input.proposal, action: null, error: result.error };
  return { proposal: input.proposal, action: result.item };
}

export function transitionCmoActionStatus(
  current: CmoActionStatus,
  next: Exclude<CmoActionStatus, "proposed">,
): CmoActionStatus {
  if (current === "proposed" && (next === "confirmed" || next === "rejected")) return next;
  if (current === "confirmed" && (next === "executed" || next === "failed")) return next;
  if (current === "executed" || current === "failed" || current === "rejected") {
    throw new Error(`Final CMO actions cannot move from ${current} to ${next}.`);
  }
  throw new Error(`CMO actions cannot move from ${current} to ${next}.`);
}

type HandlerResult = { ok: boolean; result: Record<string, unknown> };

function isDraftChannel(value: unknown): value is DraftChannel {
  return typeof value === "string" && ["linkedin", "x", "reddit", "article_brief", "email"].includes(value);
}

async function executeConfirmedAction(action: CmoAction, actor?: string): Promise<HandlerResult> {
  switch (action.actionType as CmoMutatingToolName) {
    case "propose_channel_draft": {
      const channel = isDraftChannel(action.payload.channel) ? action.payload.channel : "linkedin";
      const topic = typeof action.payload.topic === "string" ? action.payload.topic : action.title;
      const context = typeof action.payload.context === "string" ? action.payload.context : undefined;
      const bundle = await getBrainContextBundle();
      const draft = await draftForChannel(channel, { topic, context, sourceRef: { cmoActionId: action.id } }, bundle);
      if (draft.status === "skipped") return { ok: false, result: { reason: draft.reason, channel } };

      const stored = await createChannelDraft({
        channel: draft.channel,
        title: draft.title,
        body: draft.body,
        sourceRef: draft.sourceRef,
        voiceSnapshot: draft.voiceSnapshot,
        quality: draft.quality,
        rationale: draft.rationale,
        createdBy: actor ?? "growth-cmo",
      });
      return stored
        ? { ok: true, result: { draftId: stored.id, channel: stored.channel, status: stored.status } }
        : { ok: false, result: { reason: "Draft generated but Supabase is not configured, so it was not persisted.", channel } };
    }
    case "propose_site_audit_run": {
      const url = typeof action.payload.url === "string" ? action.payload.url : undefined;
      if (!url) return { ok: false, result: { reason: "No URL supplied for site audit." } };
      const summary = await runSiteAudit(url);
      return {
        ok: true,
        result: {
          url: summary.url,
          measuredAt: summary.measuredAt,
          storage: summary.storage,
          issueCount: summary.issues.length,
        },
      };
    }
    case "propose_signal_run": {
      const bundle = await getBrainContextBundle();
      const result = await runSignals(bundle);
      return { ok: true, result: { ...result, requestedType: action.payload.signalType ?? "all" } };
    }
    case "propose_brain_update":
      return {
        ok: false,
        result: {
          reason: "Brain updates are not applied automatically from CMO chat. Review the proposal and use the Brain API seed/apply flow.",
          proposedPatch: action.payload.patch ?? {},
        },
      };
    default:
      return { ok: false, result: { reason: `No handler registered for ${action.actionType}.` } };
  }
}

export async function confirmCmoAction(id: string, actor?: string) {
  const existing = await getCmoAction(id);
  if (!existing.ok) return existing;

  try {
    transitionCmoActionStatus(existing.item.status, "confirmed");
  } catch (error) {
    return {
      ok: false as const,
      configured: true,
      error: error instanceof Error ? error.message : "CMO action cannot be confirmed.",
    };
  }

  const confirmed = await updateCmoActionStatus(id, "confirmed", actor);
  if (!confirmed.ok) return confirmed;

  const execution = await executeConfirmedAction(confirmed.item, actor);
  const finalStatus = transitionCmoActionStatus(
    "confirmed",
    execution.ok ? "executed" : "failed",
  ) as Extract<CmoActionStatus, "executed" | "failed">;
  return updateCmoActionStatus(id, finalStatus, actor, execution.result);
}

export async function rejectCmoAction(id: string, actor?: string) {
  const existing = await getCmoAction(id);
  if (!existing.ok) return existing;

  try {
    transitionCmoActionStatus(existing.item.status, "rejected");
  } catch (error) {
    return {
      ok: false as const,
      configured: true,
      error: error instanceof Error ? error.message : "CMO action cannot be rejected.",
    };
  }

  return updateCmoActionStatus(id, "rejected", actor, { decision: "rejected" });
}
