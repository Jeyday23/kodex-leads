import { createClient } from "@/lib/supabase/server";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { z } from "zod";

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const OutreachSchema = z.object({
  outreach_status: z.enum([
    "not_contacted",
    "emailed",
    "replied",
    "meeting_booked",
    "converted",
    "not_interested",
  ]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getRateLimitKey(request);
    const { ok } = rateLimit(`outreach:${ip}`, 20, 60_000);
    if (!ok) {
      return Response.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id } = await params;
    if (!uuidRegex.test(id)) {
      return Response.json({ error: "Invalid ID" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = OutreachSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }

    const { data: lead, error } = await supabase
      .from("leads")
      .update({ outreach_status: parsed.data.outreach_status })
      .eq("id", id)
      .eq("partner_id", user.id)
      .select("id, outreach_status")
      .single();

    if (error || !lead) {
      return Response.json(
        { error: "Lead not found or not owned by you" },
        { status: 404 }
      );
    }

    return Response.json(lead);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
