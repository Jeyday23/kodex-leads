import { discoverKodexLeads } from "@/lib/seo/lead-discovery";
import { discoverEuDpaEnforcementLeads } from "@/lib/seo/eu-dpa-enforcement";
import { discoverEuTenderLeads } from "@/lib/seo/eu-tenders";
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

  const [discovery, euDpa, tenders] = await Promise.all([
    discoverKodexLeads(),
    discoverEuDpaEnforcementLeads(),
    discoverEuTenderLeads(),
  ]);
  // Enforcement first: a confirmed action outranks an intent signal when the
  // same organisation appears in both.
  const leads = mergeLeads(euDpa.leads, tenders.leads, discovery.leads);
  const packages = await createLeadWorkPackages(leads);
  const discoveryErrors = [...discovery.errors, ...euDpa.errors, ...tenders.errors];

  console.log(JSON.stringify({
    service: "kodex-lead-intelligence",
    status: leads.length > 0 ? "completed" : "no-leads",
    discovered: leads.length,
    euDpaEnforcement: euDpa.leads.length,
    euTenders: tenders.leads.length,
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
