import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeoPageView } from "@/app/seo-page-view";
import { getIndexedContentPages, getSeoPageByRoute } from "@/lib/seo/content";
import { canonicalForSeoPage } from "@/lib/seo/urls";

interface RouteProps {
  params: Promise<{ framework: string }>;
}

export async function generateStaticParams() {
  const pages = await getIndexedContentPages();
  return pages
    .filter((page) => page.pageType === "deadline" && page.framework)
    .map((page) => ({ framework: page.framework as string }));
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { framework } = await params;
  const page = await getSeoPageByRoute("deadline", framework, framework);
  if (!page) return {};

  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: canonicalForSeoPage(page) },
    openGraph: {
      title: page.title,
      description: page.description,
      url: canonicalForSeoPage(page),
      type: "article",
    },
    robots: {
      index: !page.noindex,
      follow: !page.noindex,
    },
  };
}

export default async function DeadlinePage({ params }: RouteProps) {
  const { framework } = await params;
  const page = await getSeoPageByRoute("deadline", framework, framework);
  if (!page) notFound();
  return <SeoPageView page={page} />;
}
