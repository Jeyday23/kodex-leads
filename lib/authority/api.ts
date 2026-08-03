import { randomUUID } from "node:crypto";

export interface ApiMetadata {
  requestId: string;
  pagination?: {
    limit: number;
    offset: number;
    total?: number;
  };
}

export function apiSuccess<T>(data: T, init?: ResponseInit & { metadata?: Partial<ApiMetadata> }) {
  const requestId = init?.metadata?.requestId ?? randomUUID();
  return Response.json({
    success: true,
    data,
    error: null,
    metadata: { requestId, ...init?.metadata },
  }, init);
}

export function apiError(message: string, status = 400, metadata?: Partial<ApiMetadata>) {
  return Response.json({
    success: false,
    data: null,
    error: { message },
    metadata: { requestId: metadata?.requestId ?? randomUUID(), ...metadata },
  }, { status });
}

export function paginationFromUrl(url: string) {
  const parsed = new URL(url);
  const limit = clamp(Number(parsed.searchParams.get("limit") ?? 25), 1, 100);
  const offset = Math.max(Number(parsed.searchParams.get("offset") ?? 0), 0);
  return { limit, offset };
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}
