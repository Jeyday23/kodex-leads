import { createSign } from "node:crypto";
import { getIndexedContentPages } from "./content";
import { getSiteUrl } from "./config";
import { pathForSeoPage } from "./urls";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const WEBMASTERS_API = "https://www.googleapis.com/webmasters/v3";
const URL_INSPECTION_API = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";
const WEBMASTERS_SCOPE = "https://www.googleapis.com/auth/webmasters";

interface GoogleCredentials {
  clientEmail: string;
  privateKey: string;
  siteUrl: string;
}

export interface UrlInspectionResult {
  url: string;
  verdict: string | null;
  coverageState: string | null;
  indexingState: string | null;
  lastCrawlTime: string | null;
  pageFetchState: string | null;
  robotsTxtState: string | null;
  error?: string;
}

export interface GoogleDiscoveryCycleResult {
  configured: boolean;
  sitemapSubmitted: boolean;
  sitemapUrl: string;
  inspected: UrlInspectionResult[];
  note: string;
}

function getCredentials(): GoogleCredentials | null {
  const clientEmail = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  const siteUrl = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL?.trim() || getSiteUrl();

  if (!clientEmail || !privateKey || !siteUrl) return null;
  return { clientEmail, privateKey, siteUrl };
}

function base64Url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function getAccessToken(credentials: GoogleCredentials): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    iss: credentials.clientEmail,
    scope: WEBMASTERS_SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = base64Url(signer.sign(credentials.privateKey));
  const assertion = `${unsigned}.${signature}`;

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    throw new Error(`Google OAuth token request failed: HTTP ${response.status} ${await response.text()}`);
  }

  const data = await response.json() as { access_token?: string };
  if (!data.access_token) throw new Error("Google OAuth token response did not contain access_token");
  return data.access_token;
}

function normalizePropertyUrl(siteUrl: string): string {
  if (siteUrl.startsWith("sc-domain:")) return siteUrl;
  return siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`;
}

export async function submitSitemap(accessToken: string, siteUrl: string, sitemapUrl: string): Promise<void> {
  const property = encodeURIComponent(normalizePropertyUrl(siteUrl));
  const feed = encodeURIComponent(sitemapUrl);
  const response = await fetch(`${WEBMASTERS_API}/sites/${property}/sitemaps/${feed}`, {
    method: "PUT",
    headers: { authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    throw new Error(`Search Console sitemap submission failed: HTTP ${response.status} ${await response.text()}`);
  }
}

export async function inspectUrl(accessToken: string, siteUrl: string, inspectionUrl: string): Promise<UrlInspectionResult> {
  const response = await fetch(URL_INSPECTION_API, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      inspectionUrl,
      siteUrl: normalizePropertyUrl(siteUrl),
      languageCode: "en-US",
    }),
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    return {
      url: inspectionUrl,
      verdict: null,
      coverageState: null,
      indexingState: null,
      lastCrawlTime: null,
      pageFetchState: null,
      robotsTxtState: null,
      error: `HTTP ${response.status}: ${await response.text()}`,
    };
  }

  const data = await response.json() as {
    inspectionResult?: {
      indexStatusResult?: {
        verdict?: string;
        coverageState?: string;
        indexingState?: string;
        lastCrawlTime?: string;
        pageFetchState?: string;
        robotsTxtState?: string;
      };
    };
  };
  const status = data.inspectionResult?.indexStatusResult;
  return {
    url: inspectionUrl,
    verdict: status?.verdict ?? null,
    coverageState: status?.coverageState ?? null,
    indexingState: status?.indexingState ?? null,
    lastCrawlTime: status?.lastCrawlTime ?? null,
    pageFetchState: status?.pageFetchState ?? null,
    robotsTxtState: status?.robotsTxtState ?? null,
  };
}

export async function runGoogleDiscoveryCycle(limit = 20): Promise<GoogleDiscoveryCycleResult> {
  const credentials = getCredentials();
  const base = getSiteUrl();
  const sitemapUrl = `${base}/sitemap.xml`;

  if (!credentials) {
    return {
      configured: false,
      sitemapSubmitted: false,
      sitemapUrl,
      inspected: [],
      note: "Google Search Console credentials are missing. Configure client email, private key and optionally the Search Console property URL.",
    };
  }

  const accessToken = await getAccessToken(credentials);
  await submitSitemap(accessToken, credentials.siteUrl, sitemapUrl);

  const pages = await getIndexedContentPages();
  const urls = pages.slice(0, Math.max(1, Math.min(limit, 50))).map((page) => `${base}${pathForSeoPage(page)}`);
  const inspected: UrlInspectionResult[] = [];
  for (const url of urls) {
    inspected.push(await inspectUrl(accessToken, credentials.siteUrl, url));
  }

  return {
    configured: true,
    sitemapSubmitted: true,
    sitemapUrl,
    inspected,
    note: "Sitemap submitted and eligible URLs inspected. Google does not provide a general-purpose Indexing API for ordinary SEO pages; discovery is driven through sitemaps/internal links and monitored through URL Inspection.",
  };
}
