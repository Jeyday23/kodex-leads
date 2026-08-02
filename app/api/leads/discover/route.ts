import { discoverKodexLeads } from "@/lib/seo/lead-discovery";

export async function POST() {
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
