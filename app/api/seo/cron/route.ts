import { runSeoIntelligenceCycle } from "@/lib/seo/cron-cycle";

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return Response.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runSeoIntelligenceCycle();

  return Response.json({ status: "ok", result });
}
