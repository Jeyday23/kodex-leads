// WS3 - shared types for signal providers. Not "server-only": run-signals.ts
// is imported directly by scripts/run-growth-signals.ts under plain tsx.

import type { BrainContextBundle, SignalConfig, SignalConfigType } from "@/lib/growth/context";

/** A signal event before it is persisted. `dedupeKey` must be stable across
 * re-runs of the same provider against the same underlying fact so re-running
 * a provider never creates duplicate rows. */
export interface SignalEventDraft {
  type: SignalConfigType;
  source: string;
  companyName?: string;
  companyDomain?: string;
  personName?: string;
  personTitle?: string;
  evidence: Record<string, unknown>;
  url?: string;
  /** 0..1. How strong this single signal is on its own. */
  strength: number;
  dedupeKey: string;
  detectedAt: string;
}

export interface SignalEventRecord extends SignalEventDraft {
  id: string;
}

export interface SignalProviderStatus {
  configured: boolean;
  missing: string[];
}

/**
 * Every provider implements this interface. `status()` must be cheap and
 * synchronous-in-spirit (no network) so the UI and run-signals.ts can report
 * "not configured" honestly before ever touching the network. `run()` MUST
 * check its own configuration and return an empty array without any network
 * call when unconfigured - never assume the caller already checked.
 */
export interface SignalProvider {
  id: string;
  label: string;
  status(): SignalProviderStatus;
  run(config: SignalConfig, bundle: BrainContextBundle): Promise<SignalEventDraft[]>;
}

export interface ProviderRunOutcome {
  providerId: string;
  status: "ok" | "skipped-unconfigured" | "skipped-disabled" | "failed";
  eventsFound: number;
  eventsStored: number;
  detail?: string;
}

export interface RunSignalsResult {
  outcomes: ProviderRunOutcome[];
  storedCount: number;
  duplicateCount: number;
  storageNote: string | null;
}
