import type { SeoContentPage } from "./types";
import { canonicalForSeoPage } from "./urls";
import { displayFramework } from "./config";

export function articleJsonLd(page: SeoContentPage) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.title,
    description: page.description,
    datePublished: page.publishedAt ?? page.updatedAt,
    dateModified: page.updatedAt,
    inLanguage: page.language,
    mainEntityOfPage: canonicalForSeoPage(page),
    about: displayFramework(page.framework),
    citation: page.sources.map((source) => source.sourceUrl),
    publisher: {
      "@type": "Organization",
      name: "Kodex SEO Engine",
      url: "https://kodex-compliance.com",
    },
  };
}

export function breadcrumbJsonLd(page: SeoContentPage) {
  const framework = displayFramework(page.framework);
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Kodex", item: "https://kodex-compliance.com" },
      { "@type": "ListItem", position: 2, name: framework },
      { "@type": "ListItem", position: 3, name: page.title, item: canonicalForSeoPage(page) },
    ],
  };
}
