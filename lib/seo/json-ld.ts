import type { SeoContentPage } from "./types";
import { canonicalForSeoPage } from "./urls";
import { displayFramework } from "./config";
import type { ComplianceDeadline } from "./deadlines";

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
      name: "Kodex",
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

export function deadlineEventJsonLd(deadline: ComplianceDeadline) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: deadline.label,
    description: deadline.description,
    startDate: deadline.date,
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    organizer: {
      "@type": "Organization",
      name: "Kodex",
      url: "https://kodex-compliance.com",
    },
  };
}

export function faqJsonLd(items: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
