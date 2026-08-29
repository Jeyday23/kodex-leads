import { NextResponse } from "next/server";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { getAgentReachStatus, readWithAgentReach } from "@/lib/seo/agent-reach";

export async function GET(request: Request) {
  const auth = await requireAuthorityApi(request, { allowCron: true });
  if (!auth.ok) return auth.response;

  const status = await getAgentReachStatus();
  return NextResponse.json({ ok: true, ...status });
}

export async function POST(request: Request) {
  const auth = await requireAuthorityApi(request, { allowCron: true });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json() as { url?: string };
    if (!body.url) {
      return NextResponse.json({ ok: false, error: "url is required" }, { status: 400 });
    }

    const research = await readWithAgentReach(body.url);
    const status = await getAgentReachStatus();
    return NextResponse.json({ ok: true, status, research });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    );
  }
}
