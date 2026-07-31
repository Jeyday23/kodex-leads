import { discoverKodexLeads } from "@/lib/seo/lead-discovery";

export async function POST() {
  const result = await discoverKodexLeads();
  return Response.json({ status: "ok", result });
}
