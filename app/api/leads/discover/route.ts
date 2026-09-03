import { requireAuthorityApi } from "@/lib/authority/auth";
import { discoverKodexLeads } from "@/lib/seo/lead-discovery";
import { discoverEuDpaEnforcementLeads } from "@/lib/seo/eu-dpa-enforcement";
import { createLeadWorkPackages } from "@/lib/seo/lead-work-packages";

export async function POST(request: Request) {
  // Signed-in administrators, or Render cron jobs presenting CRON_SECRET.
  const auth = await requireAuthorityApi(request, { allowCron: true });
  if (!auth.ok) return auth.response;

  try {
    const [result, euDpa] = await Promise.all([
      discoverKodexLeads(),
      discoverEuDpaEnforcementLeads(),
    ]);
    const leads = mergeLeads(euDpa.leads, result.leads);
    const packages = await createLeadWorkPackages(leads);
    const errors = [...result.errors, ...euDpa.errors, ...packages.errors];
    const status = leads.length === 0 && errors.length > 0 ? 502 : 200;
    return Response.json({
      status: status === 200 ? "ok" : "error",
      result: { ...result, leads },
      euDpaEnforcement: euDpa.leads.length,
      queuedForApproval: packages.queued.length,
      approvalQueue: "/admin/authority/outreach",
      errors,
    }, { status });
  } catch (error) {
    return Response.json(
      { status: "error", error: error instanceof Error ? error.message : "Lead discovery failed." },
      { status: 500 }
    );
  }
}

function mergeLeads<T extends { companyName: string; sourceUrl: string }>(...groups: T[][]): T[] {
  const selected = new Map<string, T>();
  for (const lead of groups.flat()) {
    const key = `${lead.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "")}|${lead.sourceUrl.trim().toLowerCase()}`;
    if (!selected.has(key)) selected.set(key, lead);
  }
  return [...selected.values()];
}
