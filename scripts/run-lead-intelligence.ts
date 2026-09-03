import { discoverKodexLeads } from "@/lib/seo/lead-discovery";
import { discoverEuDpaEnforcementLeads } from "@/lib/seo/eu-dpa-enforcement";
import { createLeadWorkPackages } from "@/lib/seo/lead-work-packages";

async function main() {
  if (process.env.LEAD_AUTOMATION_ENABLED === "false") {
    console.log(JSON.stringify({
      service: "kodex-lead-intelligence",
      status: "disabled",
      reason: "LEAD_AUTOMATION_ENABLED=false",
    }));
    return;
  }

  const [discovery, euDpa] = await Promise.all([
    discoverKodexLeads(),
    discoverEuDpaEnforcementLeads(),
  ]);
  const leads = mergeLeads(euDpa.leads, discovery.leads);
  const packages = await createLeadWorkPackages(leads);
  const discoveryErrors = [...discovery.errors, ...euDpa.errors];

  console.log(JSON.stringify({
    service: "kodex-lead-intelligence",
    status: leads.length > 0 ? "completed" : "no-leads",
    discovered: leads.length,
    euDpaEnforcement: euDpa.leads.length,
    queuedForApproval: packages.queued.length,
    packageErrors: packages.errors,
    discoveryErrors,
    approvalQueue: "/admin/authority/outreach",
  }));
}

function mergeLeads<T extends { companyName: string; sourceUrl: string }>(...groups: T[][]): T[] {
  const selected = new Map<string, T>();
  for (const lead of groups.flat()) {
    const key = `${lead.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "")}|${lead.sourceUrl.trim().toLowerCase()}`;
    if (!selected.has(key)) selected.set(key, lead);
  }
  return [...selected.values()];
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
