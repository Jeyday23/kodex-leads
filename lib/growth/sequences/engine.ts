// WS3 sequence step machine. Every send-type step (email, LinkedIn message,
// LinkedIn connect) lands in `awaiting_approval` and creates a
// growth_outreach_tasks row carrying drafted copy - the engine never advances
// a send step past that state on its own. Only an explicit approveStep()
// call (a human action from the approval queue) moves it forward. LinkedIn
// steps are never executed by code; a human marks them done from the queue.
// Email steps run a domain-deliverability check first and attach the result
// as a caution rather than blocking the draft.

import { checkDomainDeliverability, type DeliverabilityResult } from "@/lib/seo/domain-deliverability";
import type { BrainContextBundle } from "@/lib/growth/context";
import { draftSequenceCopy, type DraftBrief } from "./drafts";

export type SequenceStepKind = "visit" | "like" | "connect" | "message" | "email";

export interface SequenceStep {
  id: string;
  kind: SequenceStepKind;
  /** Days after enrollment (or after the previous step completes) this step is due. */
  delayDays: number;
}

/** Send-type steps carry persuasive copy and must be approved before a human
 * acts on them. Visit/like steps are plain manual actions with no copy. */
export function isSendStep(kind: SequenceStepKind): boolean {
  return kind === "email" || kind === "message" || kind === "connect";
}

export type EnrollmentState = "pending" | "awaiting_approval" | "active" | "replied" | "completed" | "stopped";

export interface TimelineEntry {
  stepId: string;
  kind: SequenceStepKind;
  status: "queued" | "awaiting_approval" | "approved" | "done" | "skipped";
  at: string;
  taskId?: string;
}

export interface Enrollment {
  id: string;
  sequenceId: string;
  leadRef: string;
  leadTable: string;
  state: EnrollmentState;
  timeline: TimelineEntry[];
}

export interface OutreachTaskDraft {
  kind: SequenceStepKind;
  draftCopy: string | null;
  status: "queued";
  dueAt: string;
  deliverability?: DeliverabilityResult;
}

export interface AdvanceResult {
  enrollment: Enrollment;
  taskToCreate: OutreachTaskDraft | null;
}

function completedStepIds(enrollment: Enrollment): Set<string> {
  return new Set(
    enrollment.timeline.filter((entry) => entry.status === "done" || entry.status === "skipped").map((entry) => entry.stepId),
  );
}

function nextPendingStep(steps: SequenceStep[], enrollment: Enrollment): SequenceStep | null {
  const done = completedStepIds(enrollment);
  return steps.find((step) => !done.has(step.id)) ?? null;
}

export interface AdvanceOptions {
  bundle: BrainContextBundle;
  brief: DraftBrief;
  recipientEmail?: string;
  now?: string;
  /** Injected for tests so no real network call is made against Disify. */
  checkDeliverability?: typeof checkDomainDeliverability;
}

/**
 * Advances an enrollment by one step. Returns a NEW enrollment (never
 * mutates the input) plus the task that should be created, if any.
 *
 * A send-type step (email, message, connect) always transitions the
 * enrollment to `awaiting_approval` and never proceeds further on this call;
 * an explicit approveStep() is required before the human-visible task moves
 * to `approved`. A non-send step (visit, like) queues a plain task and
 * leaves the enrollment `active` so the next call can pick up the following
 * step once the human marks it done.
 */
export async function advanceEnrollment(
  steps: SequenceStep[],
  enrollment: Enrollment,
  options: AdvanceOptions,
): Promise<AdvanceResult> {
  const now = options.now ?? new Date().toISOString();

  // A send step already sitting in awaiting_approval must stay there; only
  // approveStep() may move it forward.
  if (enrollment.state === "awaiting_approval") {
    return { enrollment, taskToCreate: null };
  }

  const step = nextPendingStep(steps, enrollment);
  if (!step) {
    return {
      enrollment: { ...enrollment, state: "completed", timeline: enrollment.timeline },
      taskToCreate: null,
    };
  }

  if (isSendStep(step.kind)) {
    const deliverability =
      step.kind === "email" ? await (options.checkDeliverability ?? checkDomainDeliverability)(options.recipientEmail) : undefined;

    const draft = await draftSequenceCopy(step.kind === "email" ? "email" : "linkedin", options.brief, options.bundle);

    const timelineEntry: TimelineEntry = { stepId: step.id, kind: step.kind, status: "awaiting_approval", at: now };
    return {
      enrollment: { ...enrollment, state: "awaiting_approval", timeline: [...enrollment.timeline, timelineEntry] },
      taskToCreate: {
        kind: step.kind,
        draftCopy: draft.copy,
        status: "queued",
        dueAt: now,
        deliverability,
      },
    };
  }

  // visit / like: no persuasive copy, no approval gate - still a task a
  // human must physically perform, since LinkedIn is never automated.
  const timelineEntry: TimelineEntry = { stepId: step.id, kind: step.kind, status: "queued", at: now };
  return {
    enrollment: { ...enrollment, state: "active", timeline: [...enrollment.timeline, timelineEntry] },
    taskToCreate: { kind: step.kind, draftCopy: null, status: "queued", dueAt: now },
  };
}

/**
 * Explicit human approval of the current awaiting-approval send step. This
 * is the ONLY function that moves a send step out of `awaiting_approval`;
 * the engine itself never calls it.
 */
export function approveStep(enrollment: Enrollment, stepId: string, now = new Date().toISOString()): Enrollment {
  if (enrollment.state !== "awaiting_approval") {
    throw new Error(`Cannot approve: enrollment ${enrollment.id} is not awaiting approval.`);
  }
  const entryIndex = enrollment.timeline.findIndex((entry) => entry.stepId === stepId && entry.status === "awaiting_approval");
  if (entryIndex === -1) {
    throw new Error(`Cannot approve: no awaiting-approval timeline entry for step ${stepId}.`);
  }

  const timeline = enrollment.timeline.map((entry, index) =>
    index === entryIndex ? { ...entry, status: "approved" as const, at: now } : entry,
  );

  return { ...enrollment, state: "active", timeline };
}

/** Marks a step's task done (a human completed the manual action). Advances
 * the enrollment to the next step on the following advanceEnrollment() call. */
export function markStepDone(enrollment: Enrollment, stepId: string, now = new Date().toISOString()): Enrollment {
  const timeline = enrollment.timeline.map((entry) => (entry.stepId === stepId ? { ...entry, status: "done" as const, at: now } : entry));
  return { ...enrollment, state: "active", timeline };
}
