import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { getBrainContextBundle } from "@/lib/growth/context";
import { advanceEnrollment } from "@/lib/growth/sequences/engine";
import { createEnrollment, createOutreachTask, getSequence, saveEnrollment, getEnrollment } from "@/lib/growth/sequences/store";

const enrollSchema = z.object({
  leadRef: z.string().min(1).max(200),
  leadTable: z.string().min(1).max(200),
  companyName: z.string().min(1).max(200),
  personName: z.string().max(200).optional(),
  personTitle: z.string().max(200).optional(),
  signalSummary: z.string().min(1).max(1000),
  recipientEmail: z.string().email().max(320).optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const { id: sequenceId } = await context.params;
  const parsed = enrollSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("Invalid enrollment payload.", 400);

  const sequence = await getSequence(sequenceId);
  if (!sequence) return apiError("Sequence not found.", 404);

  const created = await createEnrollment(sequenceId, parsed.data.leadRef, parsed.data.leadTable);
  if (!created.ok || !created.id) return apiError(created.error ?? "Enrollment was not created.", 500);

  const enrollment = await getEnrollment(created.id);
  if (!enrollment) return apiError("Enrollment was created but could not be read back.", 500);

  const bundle = await getBrainContextBundle();
  const advanced = await advanceEnrollment(sequence.steps, enrollment, {
    bundle,
    brief: {
      companyName: parsed.data.companyName,
      personName: parsed.data.personName,
      personTitle: parsed.data.personTitle,
      signalSummary: parsed.data.signalSummary,
      calendarLink: sequence.calendarLink ?? undefined,
    },
    recipientEmail: parsed.data.recipientEmail,
  });

  await saveEnrollment(advanced.enrollment);

  let taskId: string | undefined;
  if (advanced.taskToCreate) {
    const taskResult = await createOutreachTask(enrollment.id, advanced.taskToCreate);
    taskId = taskResult.id;
  }

  return apiSuccess({ enrollment: advanced.enrollment, task: advanced.taskToCreate, taskId }, { status: 201 });
}
