import { discoverKodexLeads } from "@/lib/seo/lead-discovery";

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
    const status = result.leads.length === 0 && result.errors.length > 0 ? 502 : 200;
    return Response.json({ status: status === 200 ? "ok" : "error", result, errors: result.errors }, { status });
  } catch (error) {
    return Response.json(
      { status: "error", error: error instanceof Error ? error.message : "Lead discovery failed." },
      { status: 500 }
    );
  }
}
