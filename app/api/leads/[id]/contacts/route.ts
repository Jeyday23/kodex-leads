import { createClient } from "@/lib/supabase/server";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getRateLimitKey(request);
    const { ok } = rateLimit(`contacts:${ip}`, 30, 60_000);
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

    const { data: lead } = await supabase
      .from("leads")
      .select("id")
      .eq("id", id)
      .eq("partner_id", user.id)
      .single();

    if (!lead) {
      return Response.json({ error: "Lead not found or not owned by you" }, { status: 404 });
    }

    const { data: contacts, error } = await supabase
      .from("contacts")
      .select("id, name, title, email, linkedin_url, phone, enrichment_source")
      .eq("lead_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      return Response.json({ error: "Failed to fetch contacts" }, { status: 500 });
    }

    return Response.json(contacts ?? []);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
