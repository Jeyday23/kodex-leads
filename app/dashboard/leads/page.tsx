import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LeadsClient } from "./client";

export default async function LeadsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: partner } = await supabase
    .from("partners")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = partner?.role === "admin";

  // RLS handles scoping: partners see own leads + unclaimed qualified leads
  // Admins see all via admin RLS policy
  const { data: leads } = await supabase
    .from("leads")
    .select(
      "id, company, email, score, source, status, team_size, uses_ai, partner_id, outreach_status, created_at"
    )
    .order("score", { ascending: false })
    .limit(200);

  const leadIds = (leads ?? []).map((l) => l.id);

  const { data: contacts } =
    leadIds.length > 0
      ? await supabase
          .from("contacts")
          .select("id, lead_id, name, title, email, linkedin_url")
          .in("lead_id", leadIds)
      : { data: [] };

  const contactCounts = new Map<string, number>();
  for (const c of contacts ?? []) {
    contactCounts.set(c.lead_id, (contactCounts.get(c.lead_id) ?? 0) + 1);
  }

  const enrichedLeads = (leads ?? []).map((l) => ({
    ...l,
    outreach_status: l.outreach_status ?? "not_contacted",
    contact_count: contactCounts.get(l.id) ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F1F3D] mb-1">All Leads</h1>
        <p className="text-sm text-[#7a8599]">
          {isAdmin
            ? "All leads in the system"
            : "Companies available for prospecting"}
        </p>
      </div>
      <LeadsClient leads={enrichedLeads} />
    </div>
  );
}
