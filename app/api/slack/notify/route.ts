import { notifyQualifiedLead } from "@/lib/slack";
import { safeCompare } from "@/lib/security";
import { z } from "zod";

const NotifySchema = z.object({
  company: z.string(),
  score: z.number(),
  source: z.string(),
  uses_ai: z.boolean(),
  team_size: z.string(),
});

export async function POST(request: Request) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  const expected = process.env.CRON_SECRET ?? "";
  if (!expected || !safeCompare(secret, expected)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = NotifySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }

    await notifyQualifiedLead(parsed.data);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
