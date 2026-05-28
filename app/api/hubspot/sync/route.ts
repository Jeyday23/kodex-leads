import { createClient, createAdminClient } from "@/lib/supabase/server";
import { createOrUpdateContact } from "@/lib/hubspot";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = getRateLimitKey(request);
    const { ok } = rateLimit(`hubspot-sync:${ip}`, 5, 60_000);
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

    const { data: leads } = await admin
      .from("leads")
      .select("*")
      .eq("status", "qualified")
      .order("created_at", { ascending: false })
      .limit(50);

    let synced = 0;
    for (const lead of leads ?? []) {
      await createOrUpdateContact({
        email: lead.email,
        company: lead.company,
        team_size: lead.team_size ?? "unknown",
        lead_score: lead.score,
        source: lead.source,
      });
      synced++;
    }

    return Response.json({ synced });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
