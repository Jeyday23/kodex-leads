import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/authority/api";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { createSequence, listSequences } from "@/lib/growth/sequences/store";

const stepSchema = z.object({
  id: z.string().min(1).max(100),
  kind: z.enum(["visit", "like", "connect", "message", "email"]),
  delayDays: z.number().int().min(0).max(365),
});

const sendWindowSchema = z.object({
  startHour: z.number().int().min(0).max(23),
  endHour: z.number().int().min(0).max(23),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
});

const sequenceSchema = z.object({
  name: z.string().min(1).max(200),
  channel: z.enum(["email", "linkedin_manual"]),
  objective: z.string().max(500).optional(),
  calendarLink: z.string().url().max(500).optional(),
  steps: z.array(stepSchema).min(1).max(20),
  dailyCap: z.number().int().min(1).max(500),
  sendWindow: sendWindowSchema,
});

export async function GET(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const sequences = await listSequences();
  return apiSuccess(sequences);
}

export async function POST(request: Request) {
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  const parsed = sequenceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("Invalid sequence payload.", 400);

  const result = await createSequence(parsed.data);
  if (!result.ok) return apiError(result.error ?? "Sequence was not created.", 500);
  return apiSuccess(result, { status: 201 });
}
