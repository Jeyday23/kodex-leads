import { getIndexedContentPages } from "@/lib/seo/content";
import { getSiteUrl } from "@/lib/seo/config";
import { pathForSeoPage } from "@/lib/seo/urls";

export async function GET() {
  const base = getSiteUrl();
  const pages = await getIndexedContentPages();
  const body = [
    "# Kodex SEO Engine",
    "",
    "Kodex publishes source-backed SEO process pages, LLM discovery feeds, assessment workflows and traffic-to-lead attribution pages.",
    "",
    "## Canonical SEO Pages",
    ...pages.map((page) => `- [${page.title}](${base}${pathForSeoPage(page)}): ${page.description}`),
    "",
    "## Primary Conversion Paths",
    `- [SEO Traffic Assessment](${base}/assess/seo)`,
    `- [SEO Queue](${base}/admin/seo)`,
    `- [Lead Inbox](${base}/admin/leads)`,
    "",
    "## Content Policy",
    "Indexable pages require source support, canonical URLs, internal links, structured data and a conversion path. Weak, duplicate or unsupported pages stay noindex.",
  ].join("\n");

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
