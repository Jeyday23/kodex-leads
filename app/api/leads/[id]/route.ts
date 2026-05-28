import { createClient } from "@/lib/supabase/server";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { z } from "zod";

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const UpdateLeadSchema = z.object({
  status: z
    .enum(["new", "qualified", "claimed", "contacted", "demo_booked", "converted", "lost"])
    .optional(),
  notes: z.string().max(2000).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getRateLimitKey(request);
    const { ok } = rateLimit(`lead-update:${ip}`, 20, 60_000);
    if (!ok) {
      return Response.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id } = await params;
    if (!uuidRegex.test(id)) {
      return Response.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = UpdateLeadSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const update: Record<string, unknown> = {};
    if (parsed.data.status) update.status = parsed.data.status;
    if (parsed.data.notes !== undefined) update.notes = parsed.data.notes;

    const { data: lead, error } = await supabase
      .from("leads")
      .update(update)
      .eq("id", id)
      .eq("partner_id", user.id)
      .select()
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
