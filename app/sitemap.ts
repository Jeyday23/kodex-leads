import type { MetadataRoute } from "next";
import { getIndexedContentPages } from "@/lib/seo/content";
import { getSiteUrl } from "@/lib/seo/config";
import { pathForSeoPage } from "@/lib/seo/urls";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const contentPages = await getIndexedContentPages();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/assess/seo`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/llms.txt`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/api/seo/ai-sitemap`, changeFrequency: "weekly", priority: 0.6 }
  ];

  return [
    ...staticRoutes,
    ...contentPages.map((page) => ({
      url: `${base}${pathForSeoPage(page)}`,
      lastModified: page.updatedAt,
      changeFrequency: page.pageType === "deadline" || page.pageType === "enforcement" ? "weekly" as const : "monthly" as const,
      priority: page.pageType === "learn" ? 0.8 : 0.7,
    })),
  ];
}
