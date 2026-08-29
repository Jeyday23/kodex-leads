import "server-only";

export type SeoMediaKind = "image" | "video";
export type SeoMediaModel =
  | "qwen-image-3"
  | "gpt-image-2"
  | "nano-banana-2-lite"
  | "minimax-h3"
  | "ltx-2.5-pro"
  | "kling-3.0"
  | "veo-3.1-fast";

const MODEL_ENDPOINTS: Record<SeoMediaModel, { path: string; kind: SeoMediaKind }> = {
  "qwen-image-3": { path: "/alibaba/qwen-image-3/text-to-image", kind: "image" },
  "nano-banana-2-lite": { path: "/nano-banana-2/lite/text-to-image", kind: "image" },
  "gpt-image-2": { path: "/openai/gpt-image-2", kind: "image" },
  "minimax-h3": { path: "/minimax/h3/text-to-video", kind: "video" },
  "ltx-2.5-pro": { path: "/lightricks/ltx-2.5/text-to-video/pro", kind: "video" },
  "kling-3.0": { path: "/kling-video/v3.0/std/text-to-video", kind: "video" },
  "veo-3.1-fast": { path: "/veo3.1/fast/text-to-video", kind: "video" },
};

const TERMINAL = new Set(["completed", "failed", "nsfw", "canceled"]);
const API_BASE = "https://platform.higgsfield.ai";

export interface SeoMediaStatus {
  configured: boolean;
  provider: "higgsfield";
  defaultImageModel: SeoMediaModel;
  defaultVideoModel: SeoMediaModel;
}

export interface SeoMediaResult {
  provider: "higgsfield";
  model: SeoMediaModel;
  kind: SeoMediaKind;
  requestId: string;
  status: string;
  assetUrl?: string;
  statusUrl?: string;
}

export function getSeoMediaStatus(): SeoMediaStatus {
  return {
    configured: Boolean(getCredentials()),
    provider: "higgsfield",
    defaultImageModel: "qwen-image-3",
    defaultVideoModel: "veo-3.1-fast",
  };
}

export function buildSeoMediaPrompt(input: {
  title: string;
  description: string;
  framework?: string;
  primaryKeyword?: string;
  format?: "hero" | "social" | "explainer";
}): string {
  const format = input.format ?? "hero";
  return [
    `Create a premium ${format} visual for Kodex Compliance.`,
    `Topic: ${input.title}.`,
    input.description,
    input.framework ? `Compliance framework: ${input.framework.toUpperCase()}.` : "",
    input.primaryKeyword ? `Search intent: ${input.primaryKeyword}.` : "",
    "Style: modern European B2B SaaS, credible, editorial, minimal, high contrast, clean geometry, sophisticated technology aesthetic.",
    "Avoid generic stock-photo clichés, fake legal seals, unsupported certification badges, dense text, tiny text, watermarks, logos of third parties, or claims that imply regulatory approval.",
    "Leave usable negative space for a headline and CTA overlay. Do not render factual compliance claims inside the image.",
  ].filter(Boolean).join(" ");
}

export async function generateSeoMedia(input: {
  prompt: string;
  model?: SeoMediaModel;
  waitForCompletion?: boolean;
}): Promise<SeoMediaResult> {
  const model = input.model ?? "qwen-image-3";
  const config = MODEL_ENDPOINTS[model];
  if (!config) throw new Error("Unsupported media model");

  const credentials = getCredentials();
  if (!credentials) {
    throw new Error("Higgsfield media generation is not configured. Set HIGGSFIELD_API_KEY_ID and HIGGSFIELD_API_KEY_SECRET.");
  }

  const headers = {
    Authorization: `Key ${credentials.id}:${credentials.secret}`,
    "Content-Type": "application/json",
  };

  const response = await fetch(`${API_BASE}${config.path}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ prompt: input.prompt }),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`Higgsfield media request returned HTTP ${response.status}`);
  }

  const job = await response.json() as { request_id?: string; status_url?: string; status?: string };
  const requestId = String(job.request_id ?? "");
  const statusUrl = String(job.status_url ?? "");
  if (!requestId || !statusUrl) throw new Error("Higgsfield returned an incomplete job response");

  if (input.waitForCompletion === false) {
    return { provider: "higgsfield", model, kind: config.kind, requestId, status: String(job.status ?? "queued"), statusUrl };
  }

  const deadline = Date.now() + 45_000;
  let delayMs = 2_000;
  while (Date.now() < deadline) {
    await delay(delayMs);
    const poll = await fetch(statusUrl, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!poll.ok) throw new Error(`Higgsfield status request returned HTTP ${poll.status}`);
    const result = await poll.json() as {
      status?: string;
      error?: string;
      images?: Array<{ url?: string }>;
      video?: { url?: string };
    };
    const status = String(result.status ?? "processing");
    if (TERMINAL.has(status)) {
      if (status !== "completed") throw new Error(result.error ?? `Higgsfield media job ${status}`);
      const assetUrl = config.kind === "image" ? result.images?.[0]?.url : result.video?.url;
      if (!assetUrl) throw new Error("Higgsfield completed without returning an asset URL");
      return { provider: "higgsfield", model, kind: config.kind, requestId, status, assetUrl, statusUrl };
    }
    delayMs = Math.min(Math.round(delayMs * 1.5), 8_000);
  }

  return { provider: "higgsfield", model, kind: config.kind, requestId, status: "processing", statusUrl };
}

function getCredentials(): { id: string; secret: string } | null {
  const id = process.env.HIGGSFIELD_API_KEY_ID ?? process.env.HF_API_KEY_ID;
  const secret = process.env.HIGGSFIELD_API_KEY_SECRET ?? process.env.HF_API_KEY_SECRET;
  return id && secret ? { id, secret } : null;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
