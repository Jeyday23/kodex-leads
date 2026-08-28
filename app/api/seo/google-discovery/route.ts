import { runGoogleDiscoveryCycle } from "@/lib/seo/google-search-console";

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return Response.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const requestedLimit = Number(url.searchParams.get("limit") ?? "20");
    const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(requestedLimit, 50)) : 20;
    const result = await runGoogleDiscoveryCycle(limit);
    return Response.json({ status: "ok", result });
  } catch (error) {
    return Response.json(
      { status: "error", error: error instanceof Error ? error.message : "Unknown Google discovery error" },
      { status: 502 },
    );
  }
}
