import { discoverKodexLeads } from "@/lib/seo/lead-discovery";
import { createLeadWorkPackages } from "@/lib/seo/lead-work-packages";

function hasDiscoveryControl(request: Request): boolean {
  const controlSecret = process.env.AUTOPILOT_CONTROL_SECRET;
  const cronSecret = process.env.CRON_SECRET;
  const controlMatch = Boolean(controlSecret && request.headers.get("x-kodex-control-secret") === controlSecret);
  const cronMatch = Boolean(cronSecret && request.headers.get("authorization") === `Bearer ${cronSecret}`);
  return controlMatch || cronMatch;
}

export async function POST(request: Request) {
  if (!hasDiscoveryControl(request)) {
    return Response.json({ status: "error", error: "Private lead-discovery control key required." }, { status: 403 });
  }

  try {
    const result = await discoverKodexLeads();
    const packages = await createLeadWorkPackages(result.leads);
    const errors = [...result.errors, ...packages.errors];
    const status = result.leads.length === 0 && errors.length > 0 ? 502 : 200;
    return Response.json({
      status: status === 200 ? "ok" : "error",
      result,
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
