import { getAuthorityInventoryPages } from "@/lib/seo/content";
import { getSiteUrl } from "@/lib/seo/config";
import { pathForSeoPage } from "@/lib/seo/urls";

export async function GET() {
  const base = getSiteUrl();
  const pages = await getAuthorityInventoryPages();
  return Response.json({
    site: base,
    generatedAt: new Date().toISOString(),
    purpose: "Canonical page inventory for AI crawlers, retrieval systems and answer-engine optimization checks.",
    pages: pages.map((page) => ({
      title: page.title,
      description: page.description,
      url: `${base}${pathForSeoPage(page)}`,
      framework: page.framework,
      pageType: page.pageType,
      primaryKeyword: page.primaryKeyword,
      searchIntent: page.searchIntent,
      qualityScore: page.qualityScore,
      sources: page.sources.map((source) => ({
        authority: source.authority,
        title: source.title,
        url: source.sourceUrl,
      })),
      operatorAction: page.body.nextAction ?? (page.targetTool ? { label: "Review target", href: page.targetTool } : null),
    })),
  });
}
