import { discoverKodexLeads } from "@/lib/seo/lead-discovery";
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

  const discovery = await discoverKodexLeads();
  const packages = await createLeadWorkPackages(discovery.leads);

  console.log(JSON.stringify({
    service: "kodex-lead-intelligence",
    status: discovery.leads.length > 0 ? "completed" : "no-leads",
    discovered: discovery.leads.length,
    queuedForApproval: packages.queued.length,
    packageErrors: packages.errors,
    discoveryErrors: discovery.errors,
    approvalQueue: "/admin/authority/outreach",
  }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
