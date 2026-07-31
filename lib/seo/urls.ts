import type { SeoContentPage, SeoPageType } from "./types";
import { getSiteUrl, normalizeFramework } from "./config";

export function pathForSeoPage(page: Pick<SeoContentPage, "pageType" | "framework" | "slug">): string {
  if (page.pageType === "learn") return `/learn/${normalizeFramework(page.framework ?? "compliance")}/${page.slug}`;
  if (page.pageType === "deadline") return `/deadlines/${normalizeFramework(page.framework ?? page.slug)}`;
  if (page.pageType === "enforcement") return `/enforcement/${normalizeFramework(page.framework ?? "compliance")}/${page.slug}`;
  if (page.pageType === "compare") return `/compare/${page.slug}`;
  return `/learn/${normalizeFramework(page.framework ?? page.slug)}`;
}

export function canonicalForSeoPage(page: Pick<SeoContentPage, "canonicalUrl" | "pageType" | "framework" | "slug">): string {
  return page.canonicalUrl ?? `${getSiteUrl()}${pathForSeoPage(page)}`;
}

export function routeMatchesPageType(pageType: SeoPageType, route: string): boolean {
  if (pageType === "learn") return route.startsWith("/learn/");
  if (pageType === "deadline") return route.startsWith("/deadlines/");
  if (pageType === "enforcement") return route.startsWith("/enforcement/");
  if (pageType === "compare") return route.startsWith("/compare/");
  return false;
}
