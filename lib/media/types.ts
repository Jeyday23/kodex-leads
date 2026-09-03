export type MediaKind = "image" | "video";
export type MediaJobStatus =
  | "pending_generation"
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "rejected"
  | "approved";

export interface MediaJob {
  id: string;
  title: string;
  sourceType: string;
  sourceId?: string | null;
  kind: MediaKind;
  aspectRatio: string;
  brief: string;
  prompt: string;
  provider: string;
  model?: string | null;
  providerRequestId?: string | null;
  providerStatusUrl?: string | null;
  resultUrl?: string | null;
  status: MediaJobStatus;
  error?: string | null;
  createdBy: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMediaJobInput {
  title: string;
  sourceType?: string;
  sourceId?: string | null;
  kind: MediaKind;
  aspectRatio?: string;
  brief: string;
  createdBy: string;
}
