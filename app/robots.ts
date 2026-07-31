import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo/config";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/dashboard/", "/login", "/api/", "/_next/", "/drafts/", "/review/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
