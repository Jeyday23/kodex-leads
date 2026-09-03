import { captureLead, leadCaptureSchema } from "@/lib/seo/lead-intake";

export async function POST(request: Request) {
  const parsed = leadCaptureSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid lead payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await captureLead(parsed.data);
  if (!result.ok) {
    return Response.json({ error: result.error, detail: result.detail }, { status: 500 });
  }

  return Response.json({
    status: "ok",
    persisted: true,
    storage: result.storage,
    leadId: result.leadId,
    score: result.score,
    attribution: result.attribution,
    routing: result.routing,
  });
}
