import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { getOutreachTask, updateTaskStatus } from "@/lib/growth/sequences/store";
import { getEmailSender } from "@/lib/growth/sequences/email-sender";

const doneSchema = z.object({
  recipientEmail: z.string().email().max(320).optional(),
});

function splitSubjectAndBody(draftCopy: string): { subject: string; body: string } {
  const subjectMatch = draftCopy.match(/^Subject:\s*(.+)\r?\n\r?\n?/i);
  if (subjectMatch) {
    return { subject: subjectMatch[1].trim(), body: draftCopy.slice(subjectMatch[0].length).trim() };
  }
  return { subject: "Follow-up from Kodex Compliance", body: draftCopy };
}

/**
 * Marks a task done. This is always an explicit action a human clicks in the
 * approval queue - never triggered by a schedule or by the sequence engine.
 * For an "email" task with a recipient address, this is the one place the
 * Resend adapter is ever invoked, using the task's own drafted copy; without
 * RESEND_API_KEY it stays queue-only and the task is still marked done (the
 * human sent it manually). LinkedIn task kinds never touch the network here
 * or anywhere else.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const parsed = doneSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return apiError("Invalid request payload.", 400);

  const task = await getOutreachTask(id);
  if (!task) return apiError("Task not found.", 404);

  const updated = await updateTaskStatus(id, "done");
  if (!updated.ok) return apiError(updated.error ?? "Task could not be marked done.", 500);

  let sendResult: { status: string; detail?: string } | null = null;
  if (task.kind === "email" && parsed.data.recipientEmail && task.draftCopy) {
    const { subject, body } = splitSubjectAndBody(task.draftCopy);
    const sender = getEmailSender();
    sendResult = await sender.send({ to: parsed.data.recipientEmail, subject, body });
  }

  return apiSuccess({ ok: true, sendResult });
}
