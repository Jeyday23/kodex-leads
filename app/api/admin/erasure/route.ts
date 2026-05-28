import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { z } from "zod";

const ErasureSchema = z.object({
  email: z.string().email().max(320),
});

export async function POST(request: Request) {
  try {
    const ip = getRateLimitKey(request);
    const { ok } = rateLimit(`erasure:${ip}`, 3, 60_000);
    if (!ok) {
      return Response.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: partner } = await admin
      .from("partners")
      .select("role")
      .eq("id", user.id)
      .single();

    if (partner?.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = ErasureSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }

    const { email } = parsed.data;
    const results: Record<string, number> = {};

    const { data: leads } = await admin
      .from("leads")
      .select("id")
      .eq("email", email);

    const leadIds = (leads ?? []).map((l) => l.id);

    if (leadIds.length > 0) {
      const { count: contactsDeleted } = await admin
        .from("contacts")
        .delete({ count: "exact" })
        .in("lead_id", leadIds);
      results.contacts = contactsDeleted ?? 0;

      const { count: eventsDeleted } = await admin
        .from("lead_events")
        .delete({ count: "exact" })
        .in("lead_id", leadIds);
      results.lead_events = eventsDeleted ?? 0;
    }

    const { count: leadsDeleted } = await admin
      .from("leads")
      .delete({ count: "exact" })
      .eq("email", email);
    results.leads = leadsDeleted ?? 0;

    const { data: contactsByEmail } = await admin
      .from("contacts")
      .select("id")
      .eq("email", email);

    if (contactsByEmail && contactsByEmail.length > 0) {
      const { count: directContactsDeleted } = await admin
        .from("contacts")
        .delete({ count: "exact" })
        .eq("email", email);
      results.direct_contacts = directContactsDeleted ?? 0;
    }

    return Response.json({
      email,
      deleted: results,
      note: "If this person exists in HubSpot, you must also delete them there manually via the HubSpot GDPR deletion tool.",
    });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
