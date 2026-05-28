import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProspectingFeed } from "./feed";

export default async function DashboardHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // RLS policy "leads_prospect_view" + "leads_partner_own" handles scoping:
  // partner sees their own leads + unclaimed qualified leads
  const { data: prospects } = await supabase
    .from("leads")
    .select(
      "id, company, score, source, uses_ai, team_size, funding_stage, outreach_status, assessment_data, partner_id, status"
    )
    .in("outreach_status", ["not_contacted", "emailed"])
    .order("score", { ascending: false })
    .limit(30);

  const leadIds = (prospects ?? []).map((p) => p.id);

  // RLS policy "contacts_partner_view" handles scoping
  const { data: contacts } = leadIds.length > 0
    ? await supabase
        .from("contacts")
        .select("id, lead_id, name, title, email, linkedin_url, phone")
        .in("lead_id", leadIds)
    : { data: [] };

  const contactsByLead = new Map<string, typeof contacts>();
  for (const c of contacts ?? []) {
    const existing = contactsByLead.get(c.lead_id) ?? [];
    existing.push(c);
    contactsByLead.set(c.lead_id, existing);
  }

  const feed = (prospects ?? []).map((p) => ({
    ...p,
    funding_stage: p.funding_stage ?? "unknown",
    outreach_status: p.outreach_status ?? "not_contacted",
    assessment_data: p.assessment_data as Record<string, unknown> | null,
    contacts: (contactsByLead.get(p.id) ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      title: c.title,
      email: c.email ?? null,
      linkedin_url: c.linkedin_url ?? null,
      phone: c.phone ?? null,
    })),
  }));

  const stats = {
    totalProspects: feed.length,
    withContacts: feed.filter((p) => p.contacts.length > 0).length,
    emailed: feed.filter((p) => p.outreach_status === "emailed").length,
  };

  return <ProspectingFeed prospects={feed} stats={stats} />;
}
