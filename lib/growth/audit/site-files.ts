// Fetches the well-known site files the GEO checklist inspects: robots.txt,
// llms.txt (the emerging AI-crawler convention), and sitemap.xml. Kept as its
// own module and injected into geo-checklist.ts so the checklist logic stays
// testable on inline fixtures with no network.

export interface SiteFileResult {
  present: boolean;
  status: number | null;
  body: string | null;
  detail?: string;
}

export interface SiteFilesBundle {
  robotsTxt: SiteFileResult;
  llmsTxt: SiteFileResult;
  sitemapXml: SiteFileResult;
}

const FETCH_TIMEOUT_MS = 10_000;

async function fetchTextFile(url: string): Promise<SiteFileResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { method: "GET", signal: controller.signal, redirect: "follow" });
    if (!response.ok) {
      return { present: false, status: response.status, body: null, detail: `HTTP ${response.status}` };
    }
    const body = await response.text();
    return { present: true, status: response.status, body };
  } catch (error) {
    return {
      present: false,
      status: null,
      body: null,
      detail: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function resolveWellKnown(baseUrl: string, path: string): string {
  const origin = new URL(baseUrl).origin;
  return `${origin}${path}`;
}

/** Fetches robots.txt, llms.txt, and sitemap.xml relative to the site's origin. */
export async function fetchSiteFiles(baseUrl: string): Promise<SiteFilesBundle> {
  const [robotsTxt, llmsTxt, sitemapXml] = await Promise.all([
    fetchTextFile(resolveWellKnown(baseUrl, "/robots.txt")),
    fetchTextFile(resolveWellKnown(baseUrl, "/llms.txt")),
    fetchTextFile(resolveWellKnown(baseUrl, "/sitemap.xml")),
  ]);
  return { robotsTxt, llmsTxt, sitemapXml };
}
