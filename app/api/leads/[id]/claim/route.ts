import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getRateLimitKey(request);
    const { ok } = rateLimit(`claim:${ip}`, 10, 60_000);
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

    const admin = createAdminClient();

    // Atomic claim: only succeeds if lead is unclaimed and qualified
    const { data: updated, error } = await admin
      .from("leads")
      .update({ partner_id: user.id, status: "claimed" })
      .eq("id", id)
      .is("partner_id", null)
      .eq("status", "qualified")
      .select()
      .single();

    if (error || !updated) {
      return Response.json(
        { error: "Lead not found, already claimed, or not qualified" },
        { status: 409 }
      );
    }

    await admin.from("lead_events").insert({
      lead_id: id,
      event_type: "score_changed",
      metadata: { action: "claimed", partner_id: user.id },
    });

    return Response.json(updated);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
