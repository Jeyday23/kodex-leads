export const DEFAULT_SITE_URL = "https://kodex-compliance.com";

export function getSiteUrl(): string {
  const rawUrl = process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL;
  return rawUrl.replace(/\/+$/, "");
}

export function normalizeFramework(framework: string): string {
  return framework.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function displayFramework(framework?: string | null): string {
  if (!framework) return "Compliance";
  const labels: Record<string, string> = {
    "eu-ai-act": "EU AI Act",
    gdpr: "GDPR",
    nis2: "NIS2",
    dora: "DORA",
    "iso-27001": "ISO 27001",
    soc2: "SOC 2",
    cra: "Cyber Resilience Act",
    "product-liability": "Product Liability",
  };
  return labels[framework] ?? framework.split("-").map((part) => part.toUpperCase()).join(" ");
}
