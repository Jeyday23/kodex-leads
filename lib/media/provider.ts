import "server-only";
import type { MediaJob } from "./types";

interface ProviderSubmission {
  provider: string;
  model?: string | null;
  providerRequestId?: string | null;
  providerStatusUrl?: string | null;
  resultUrl?: string | null;
  status: MediaJob["status"];
  error?: string | null;
}

function compatibleProviderConfig(kind: MediaJob["kind"]) {
  const provider = process.env.MEDIA_PROVIDER ?? "queue-only";
  if (provider !== "higgsfield-api-compat") return null;

  const keyId = process.env.HF_API_KEY_ID;
  const secret = process.env.HF_API_KEY_SECRET;
  const base = process.env.HIGGSFIELD_API_BASE ?? "https://platform.higgsfield.ai";
  const imagePath = process.env.HIGGSFIELD_IMAGE_PATH ?? "/openai/gpt-image-2";
  const videoPath = process.env.HIGGSFIELD_VIDEO_PATH ?? "/kling-video/v3.0/std/text-to-video";
  if (!keyId || !secret) throw new Error("Kodex-owned Higgsfield compatibility credentials are not configured.");

  return {
    provider,
    endpoint: new URL(kind === "image" ? imagePath : videoPath, base).toString(),
    auth: `Key ${keyId}:${secret}`,
    model: kind === "image" ? process.env.HIGGSFIELD_IMAGE_MODEL ?? "gpt-image-2" : process.env.HIGGSFIELD_VIDEO_MODEL ?? "kling-3.0",
  };
}

export function mediaProviderReadiness() {
  const provider = process.env.MEDIA_PROVIDER ?? "queue-only";
  if (provider === "queue-only") {
    return { ready: true, provider, detail: "Media briefs and approvals are active; paid generation is intentionally queued." };
  }
  if (provider === "higgsfield-api-compat") {
    const ready = Boolean(process.env.HF_API_KEY_ID && process.env.HF_API_KEY_SECRET);
    return {
      ready,
      provider,
      detail: ready
        ? "Higgsfield compatibility generation is configured with Kodex-owned credentials."
        : "Add Kodex-owned HF_API_KEY_ID and HF_API_KEY_SECRET before enabling paid generation.",
    };
  }
  return { ready: false, provider, detail: `Unsupported MEDIA_PROVIDER: ${provider}` };
}

export async function submitMediaGeneration(job: MediaJob): Promise<ProviderSubmission> {
  const config = compatibleProviderConfig(job.kind);
  if (!config) {
    return { provider: "queue-only", status: "pending_generation" };
  }

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      Authorization: config.auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt: job.prompt, aspect_ratio: job.aspectRatio }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Media provider rejected generation (${response.status}): ${text.slice(0, 300)}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const requestId = typeof payload.request_id === "string" ? payload.request_id : null;
  const statusUrl = typeof payload.status_url === "string" ? payload.status_url : null;
  const imageUrl = Array.isArray(payload.images) && payload.images[0] && typeof (payload.images[0] as Record<string, unknown>).url === "string"
    ? String((payload.images[0] as Record<string, unknown>).url)
    : null;
  const videoUrl = payload.video && typeof payload.video === "object" && typeof (payload.video as Record<string, unknown>).url === "string"
    ? String((payload.video as Record<string, unknown>).url)
    : null;

  return {
    provider: config.provider,
    model: config.model,
    providerRequestId: requestId,
    providerStatusUrl: statusUrl,
    resultUrl: imageUrl ?? videoUrl,
    status: imageUrl || videoUrl ? "completed" : "queued",
  };
}

export async function refreshMediaGeneration(job: MediaJob): Promise<Partial<MediaJob>> {
  if (job.provider !== "higgsfield-api-compat" || !job.providerStatusUrl) return {};
  const keyId = process.env.HF_API_KEY_ID;
  const secret = process.env.HF_API_KEY_SECRET;
  if (!keyId || !secret) return { status: "failed", error: "Media provider credentials are unavailable." };

  const response = await fetch(job.providerStatusUrl, {
    headers: { Authorization: `Key ${keyId}:${secret}` },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) return { error: `Status refresh failed (${response.status}).` };

  const payload = (await response.json()) as Record<string, unknown>;
  const rawStatus = String(payload.status ?? "processing").toLowerCase();
  const imageUrl = Array.isArray(payload.images) && payload.images[0] && typeof (payload.images[0] as Record<string, unknown>).url === "string"
    ? String((payload.images[0] as Record<string, unknown>).url)
    : null;
  const videoUrl = payload.video && typeof payload.video === "object" && typeof (payload.video as Record<string, unknown>).url === "string"
    ? String((payload.video as Record<string, unknown>).url)
    : null;

  if (rawStatus === "completed") return { status: "completed", resultUrl: imageUrl ?? videoUrl, error: null };
  if (["failed", "nsfw", "canceled", "cancelled"].includes(rawStatus)) {
    return { status: "failed", error: String(payload.error ?? rawStatus) };
  }
  return { status: rawStatus === "queued" ? "queued" : "processing" };
}
