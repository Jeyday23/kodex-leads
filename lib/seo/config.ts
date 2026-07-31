export const DEFAULT_SITE_URL = "https://kodex-compliance.com";

export function getSiteUrl(): string {
  const rawUrl = process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL;
  return rawUrl.replace(/\/+$/, "");
}

export function normalizeFramework(framework: string): string {
  return framework.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function displayFramework(framework?: string | null): string {
  if (!framework) return "SEO";
  const labels: Record<string, string> = {
    seo: "SEO",
  };
  return labels[framework] ?? framework.split("-").map((part) => part.toUpperCase()).join(" ");
}
