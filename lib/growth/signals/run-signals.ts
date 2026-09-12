// WS3 signal fan-out. Runs every enabled provider from the bundle's
// signalConfigs concurrently, tolerating individual provider failures
// (Promise.allSettled), dedupes on dedupe_key before persisting, and reports
// per-provider outcomes including providers skipped because they are
// unconfigured or disabled.
//
// Not "server-only": scripts/run-growth-signals.ts imports this directly.

import type { BrainContextBundle, SignalConfig } from "@/lib/growth/context";
import type { ProviderRunOutcome, RunSignalsResult, SignalEventDraft, SignalProvider } from "./types";
import { jSearchHiringProvider, adzunaHiringProvider } from "./providers/hiring";
import { stackSignalProvider } from "./providers/stack";
import { regulatorySignalProvider } from "./providers/regulatory";
import { storeSignalEvents } from "./store";

const PROVIDERS_BY_TYPE: Record<string, SignalProvider[]> = {
  hiring: [jSearchHiringProvider, adzunaHiringProvider],
  stack: [stackSignalProvider],
  regulatory: [regulatorySignalProvider],
  // keyword, competitor, influencer, own_brand and manual signals are created
  // directly through the manual classifier via the API, not by a fan-out
  // provider, so they have no entry here.
};

export function dedupeSignalEvents(events: SignalEventDraft[]): { unique: SignalEventDraft[]; duplicateCount: number } {
  const seen = new Map<string, SignalEventDraft>();
  let duplicateCount = 0;
  for (const event of events) {
    if (seen.has(event.dedupeKey)) {
      duplicateCount += 1;
      continue;
    }
    seen.set(event.dedupeKey, event);
  }
  return { unique: [...seen.values()], duplicateCount };
}

export async function runSignals(bundle: BrainContextBundle): Promise<RunSignalsResult> {
  const outcomes: ProviderRunOutcome[] = [];
  const allEvents: SignalEventDraft[] = [];

  const configsByType = new Map<string, SignalConfig>(bundle.signalConfigs.map((config) => [config.type, config]));

  const tasks: Array<{ provider: SignalProvider; config: SignalConfig }> = [];
  for (const [type, providers] of Object.entries(PROVIDERS_BY_TYPE)) {
    const config = configsByType.get(type);
    if (!config) continue;
    for (const provider of providers) {
      if (!config.enabled) {
        outcomes.push({ providerId: provider.id, status: "skipped-disabled", eventsFound: 0, eventsStored: 0 });
        continue;
      }
      const status = provider.status();
      if (!status.configured) {
        outcomes.push({
          providerId: provider.id,
          status: "skipped-unconfigured",
          eventsFound: 0,
          eventsStored: 0,
          detail: `Missing ${status.missing.join(", ")}`,
        });
        continue;
      }
      tasks.push({ provider, config });
    }
  }

  const settled = await Promise.allSettled(tasks.map(({ provider, config }) => provider.run(config, bundle)));

  settled.forEach((result, index) => {
    const { provider } = tasks[index];
    if (result.status === "fulfilled") {
      allEvents.push(...result.value);
      outcomes.push({ providerId: provider.id, status: "ok", eventsFound: result.value.length, eventsStored: 0 });
    } else {
      outcomes.push({
        providerId: provider.id,
        status: "failed",
        eventsFound: 0,
        eventsStored: 0,
        detail: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
    }
  });

  const { unique, duplicateCount } = dedupeSignalEvents(allEvents);
  const storeResult = await storeSignalEvents(unique);

  // Distribute the stored count back across the outcomes that actually
  // produced events, in provider order, so the report stays honest per
  // provider without a second round trip to the database.
  let remainingStored = storeResult.stored;
  for (const outcome of outcomes) {
    if (outcome.status !== "ok" || outcome.eventsFound === 0) continue;
    const attributed = Math.min(outcome.eventsFound, remainingStored);
    outcome.eventsStored = attributed;
    remainingStored -= attributed;
  }

  return {
    outcomes,
    storedCount: storeResult.stored,
    duplicateCount: duplicateCount + storeResult.duplicates,
    storageNote: storeResult.note,
  };
}
