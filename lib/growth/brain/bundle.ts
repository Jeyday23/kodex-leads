// Assembles the full BrainContextBundle from the Growth Brain store. This is
// the module lib/growth/context.ts calls from getBrainContextBundle(); kept
// separate so context.ts stays a small, dependency-light module that every
// other Growth workstream imports for types alone.
//
// Not "server-only": reachable from scripts/ and workers/ via context.ts.

import type { BrainContextBundle } from "@/lib/growth/context";
import {
  getProfile,
  listChannelVoices,
  listCompetitors,
  listInfluencers,
  listKeywords,
  listMessagePillars,
  listObjections,
  listPersonas,
  listSignalConfigs,
} from "@/lib/growth/brain/store";

/**
 * Reads every Brain category from the store in parallel and assembles the
 * bundle. Each store function already falls back to its seed slice when
 * Supabase is not configured or a table is empty, so with no Supabase
 * configured this resolves to exactly seedBrainContextBundle.
 */
export async function loadBrainContextBundle(): Promise<BrainContextBundle> {
  const [profile, personas, keywords, messagePillars, objections, competitors, influencers, channelVoices, signalConfigs] =
    await Promise.all([
      getProfile(),
      listPersonas(),
      listKeywords(),
      listMessagePillars(),
      listObjections(),
      listCompetitors(),
      listInfluencers(),
      listChannelVoices(),
      listSignalConfigs(),
    ]);

  return {
    profile,
    personas,
    keywords,
    messagePillars,
    objections,
    competitors,
    influencers,
    channelVoices,
    signalConfigs,
  };
}
