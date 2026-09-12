// Re-exports the Brain's public types from lib/growth/context.ts so every
// WS1 module (store, seed-from-website, routes, UI) imports from one place
// without reaching past lib/growth/brain into context.ts directly for types
// alone. Mutation input types used by the store and the API routes live here.
//
// Not "server-only": scripts/ and workers/ may import lib/growth/brain/**
// directly under plain tsx.

export type {
  BrainContextBundle,
  ChannelVoice,
  CompanyIcp,
  CompanyProfile,
  Competitor,
  GrowthChannel,
  Influencer,
  Keyword,
  KeywordType,
  MessagePillar,
  Objection,
  Persona,
  SignalConfig,
  SignalConfigType,
} from "@/lib/growth/context";

import type {
  CompanyIcp,
  GrowthChannel,
  KeywordType,
  SignalConfigType,
} from "@/lib/growth/context";

export interface ProfileUpdateInput {
  name?: string;
  oneLineDescription?: string;
  website?: string;
  vertical?: string;
  headquarters?: string;
  marketSummary?: string;
  icp?: Partial<CompanyIcp>;
  salesLanguageRules?: string[];
}

export interface PersonaInput {
  name: string;
  title: string;
  goals?: string[];
  pains?: string[];
  triggers?: string[];
}

export interface KeywordInput {
  term: string;
  type: KeywordType;
  language?: string;
}

export interface MessagePillarInput {
  title: string;
  claim: string;
  proof: string;
}

export interface ObjectionInput {
  objection: string;
  response: string;
}

export interface InfluencerInput {
  name: string;
  handle?: string;
  platform?: string;
  why?: string;
}

export interface CompetitorInput {
  name: string;
  domain?: string;
  summary?: string;
}

export interface ChannelVoiceInput {
  channel: GrowthChannel;
  tone: string;
  rules?: string[];
  bannedTerms?: string[];
  maxLength: number;
  example: string;
}

export interface SignalConfigInput {
  type: SignalConfigType;
  enabled: boolean;
  targets?: string[];
}

export type StoreWriteResult = { ok: true; id?: string } | { ok: false; error: string };

export const NOT_CONFIGURED_ERROR = "Supabase is not configured for the Growth Brain store.";
