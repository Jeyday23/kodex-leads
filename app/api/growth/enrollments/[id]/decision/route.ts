import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { approveStep } from "@/lib/growth/sequences/engine";
import { getEnrollment, saveEnrollment, updateTaskStatus } from "@/lib/growth/sequences/store";

const decisionSchema = z.object({
  stepId: z.string().min(1).max(100),
  decision: z.enum(["approved", "rejected"]),
  taskId: z.string().uuid().optional(),
});

/**
 * The explicit human approval action for a send-type step. This is the only
 * way a step ever moves out of `awaiting_approval` - the sequence engine
 * never advances one on its own (rule 5: never auto-send).
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("Invalid decision payload.", 400);

  const enrollment = await getEnrollment(id);
  if (!enrollment) return apiError("Enrollment not found.", 404);

  if (parsed.data.decision === "rejected") {
    const stopped = { ...enrollment, state: "stopped" as const };
    await saveEnrollment(stopped);
    if (parsed.data.taskId) await updateTaskStatus(parsed.data.taskId, "skipped");
    return apiSuccess({ enrollment: stopped });
  }

  try {
    const approved = approveStep(enrollment, parsed.data.stepId);
    await saveEnrollment(approved);
    if (parsed.data.taskId) await updateTaskStatus(parsed.data.taskId, "approved");
    return apiSuccess({ enrollment: approved });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Approval failed.", 409);
  }
}
