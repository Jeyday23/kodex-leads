import { NextResponse } from "next/server";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { getAllSeoPages } from "@/lib/seo/content";
import { buildSeoMediaPrompt, generateSeoMedia, getSeoMediaStatus, type SeoMediaModel } from "@/lib/seo/media-generation";
import { storeAuditEventLocally } from "@/lib/seo/local-store";

export async function GET(request: Request) {
  const auth = await requireAuthorityApi(request, { allowCron: true });
  if (!auth.ok) return auth.response;
  return NextResponse.json({ ok: true, ...getSeoMediaStatus() });
}

export async function POST(request: Request) {
  const auth = await requireAuthorityApi(request, { allowCron: true });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json() as {
      pageId?: string;
      prompt?: string;
      model?: SeoMediaModel;
      format?: "hero" | "social" | "explainer";
      waitForCompletion?: boolean;
    };

    let prompt = body.prompt?.trim();
    let contentId: string | undefined;

    if (!prompt && body.pageId) {
      const pages = await getAllSeoPages();
      const page = pages.find((candidate) => candidate.id === body.pageId);
      if (!page) return NextResponse.json({ ok: false, error: "SEO page not found" }, { status: 404 });
      contentId = page.id;
      prompt = buildSeoMediaPrompt({
        title: page.title,
        description: page.description,
        framework: page.framework,
        primaryKeyword: page.primaryKeyword,
        format: body.format,
      });
    }

    if (!prompt) {
      return NextResponse.json({ ok: false, error: "pageId or prompt is required" }, { status: 400 });
    }

    const result = await generateSeoMedia({
      prompt,
      model: body.model,
      waitForCompletion: body.waitForCompletion,
    });

    await storeAuditEventLocally({
      eventType: "seo_media_generated",
      contentId,
      payload: {
        provider: result.provider,
        model: result.model,
        kind: result.kind,
        requestId: result.requestId,
        status: result.status,
        assetUrl: result.assetUrl ?? null,
      },
    });

    return NextResponse.json({ ok: true, prompt, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    );
  }
}
