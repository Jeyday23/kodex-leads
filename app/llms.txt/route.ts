import { getIndexedContentPages } from "@/lib/seo/content";
import { getSiteUrl } from "@/lib/seo/config";
import { pathForSeoPage } from "@/lib/seo/urls";

export async function GET() {
  const base = getSiteUrl();
  const pages = await getIndexedContentPages();
  const body = [
    "# Kodex",
    "",
    "Kodex publishes source-backed EU compliance pages, deadline intelligence, comparison pages, assessment workflows and traffic-to-lead attribution paths.",
    "",
    "## Canonical Compliance Pages",
    ...pages.map((page) => `- [${page.title}](${base}${pathForSeoPage(page)}): ${page.description}`),
    "",
    "## Primary Conversion Paths",
    `- [EU AI Act Assessment](${base}/assess/eu-ai-act)`,
    `- [GDPR Assessment](${base}/assess/gdpr)`,
    `- [NIS2 Assessment](${base}/assess/nis2)`,
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
