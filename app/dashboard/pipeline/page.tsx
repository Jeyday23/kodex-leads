import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PipelineView } from "./pipeline-view";

export default async function PipelinePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // RLS scopes to partner's own leads
  const { data: leads } = await supabase
    .from("leads")
    .select("id, company, score, outreach_status, partner_id, created_at")
    .eq("partner_id", user.id)
    .order("score", { ascending: false });

  const leadIds = (leads ?? []).map((l) => l.id);

  const { data: contacts } =
    leadIds.length > 0
      ? await supabase
          .from("contacts")
          .select("lead_id, name, title")
          .in("lead_id", leadIds)
      : { data: [] };

  const primaryContacts = new Map<
    string,
    { name: string; title: string }
  >();
  for (const c of contacts ?? []) {
    if (!primaryContacts.has(c.lead_id)) {
      primaryContacts.set(c.lead_id, { name: c.name, title: c.title });
    }
  }

  const pipelineLeads = (leads ?? []).map((l) => ({
    id: l.id,
    company: l.company,
    score: l.score,
    outreach_status: l.outreach_status ?? "not_contacted",
    primary_contact: primaryContacts.get(l.id) ?? null,
    days_in_stage: Math.floor(
      (Date.now() - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24)
    ),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F1F3D] mb-1">Pipeline</h1>
        <p className="text-sm text-[#7a8599]">
          Track your outreach progress across all claimed leads
        </p>
      </div>
      <PipelineView leads={pipelineLeads} />
    </div>
  );
}
