import { createAdminClient } from "@/lib/supabase/server";
import { LeadsClient } from "@/app/dashboard/leads/client";

export default async function AdminLeadsPage() {
  const admin = createAdminClient();
  const { data: leads } = await admin
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F1F3D] mb-1">All Leads</h1>
        <p className="text-sm text-[#7a8599]">
          Every lead in the system — {leads?.length ?? 0} total
        </p>
      </div>
      <LeadsClient leads={leads ?? []} />
    </div>
  );
}
