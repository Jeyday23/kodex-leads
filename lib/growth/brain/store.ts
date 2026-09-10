// Growth Brain store: reads and writes every Brain category through
// getSeoSupabase(), falling back to the seed bundle whenever Supabase is not
// configured (same pattern as lib/authority/store.ts). Never throws on a
// write: an unconfigured store returns { ok: false, error } instead.
//
// Not "server-only": scripts/ and workers/ import lib/growth/brain/**
// directly under plain tsx (tests/server-module-boundaries.test.ts enforces
// this).

import { getSeoSupabase } from "@/lib/seo/db";
import { seedBrainContextBundle } from "@/lib/growth/context";
import type {
  ChannelVoice,
  ChannelVoiceInput,
  CompanyProfile,
  Competitor,
  CompetitorInput,
  GrowthChannel,
  Influencer,
  InfluencerInput,
  Keyword,
  KeywordInput,
  MessagePillar,
  MessagePillarInput,
  Objection,
  ObjectionInput,
  Persona,
  PersonaInput,
  ProfileUpdateInput,
  SignalConfig,
  SignalConfigInput,
  SignalConfigType,
  StoreWriteResult,
} from "@/lib/growth/brain/types";
import { NOT_CONFIGURED_ERROR } from "@/lib/growth/brain/types";

const CHANNELS: GrowthChannel[] = ["linkedin", "x", "reddit", "articles", "email"];
const SIGNAL_TYPES: SignalConfigType[] = [
  "keyword",
  "competitor",
  "influencer",
  "own_brand",
  "hiring",
  "stack",
  "regulatory",
  "manual",
];

// ---------------------------------------------------------------------------
// Generic CRUD over one simple `id + fields` table. Covers personas,
// keywords, message pillars, objections and influencers, which all share the
// same shape (list ordered by creation, create, update, delete).
// ---------------------------------------------------------------------------

interface CrudConfig<Row, Domain, Input> {
  table: string;
  seed: Domain[];
  mapRow: (row: Row) => Domain;
  toInsert: (input: Input) => Record<string, unknown>;
  toUpdate: (input: Partial<Input>) => Record<string, unknown>;
  columns: string;
}

function makeCrud<Row, Domain, Input>(config: CrudConfig<Row, Domain, Input>) {
  async function list(): Promise<Domain[]> {
    const supabase = getSeoSupabase();
    if (!supabase) return config.seed;

    const { data, error } = await supabase
      .from(config.table)
      .select(config.columns)
      .order("created_at", { ascending: true });

    if (error || !data || data.length === 0) return config.seed;
    return (data as unknown as Row[]).map(config.mapRow);
  }

  async function create(input: Input): Promise<StoreWriteResult> {
    const supabase = getSeoSupabase();
    if (!supabase) return { ok: false, error: NOT_CONFIGURED_ERROR };

    const { data, error } = await supabase
      .from(config.table)
      .insert(config.toInsert(input))
      .select("id")
      .single();

    if (error || !data) return { ok: false, error: error?.message ?? `Could not create ${config.table} row.` };
    return { ok: true, id: data.id };
  }

  async function update(id: string, input: Partial<Input>): Promise<StoreWriteResult> {
    const supabase = getSeoSupabase();
    if (!supabase) return { ok: false, error: NOT_CONFIGURED_ERROR };

    const updates = { ...config.toUpdate(input), updated_at: new Date().toISOString() };
    const { error } = await supabase.from(config.table).update(updates).eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  async function remove(id: string): Promise<StoreWriteResult> {
    const supabase = getSeoSupabase();
    if (!supabase) return { ok: false, error: NOT_CONFIGURED_ERROR };

    const { error } = await supabase.from(config.table).delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  return { list, create, update, remove };
}

interface PersonaRow {
  id: string;
  name: string;
  title: string;
  goals: string[] | null;
  pains: string[] | null;
  triggers: string[] | null;
}

const personaCrud = makeCrud<PersonaRow, Persona, PersonaInput>({
  table: "growth_personas",
  seed: seedBrainContextBundle.personas,
  columns: "id, name, title, goals, pains, triggers",
  mapRow: (row) => ({ id: row.id, name: row.name, title: row.title, goals: row.goals ?? [], pains: row.pains ?? [], triggers: row.triggers ?? [] }),
  toInsert: (input) => ({ name: input.name, title: input.title, goals: input.goals ?? [], pains: input.pains ?? [], triggers: input.triggers ?? [] }),
  toUpdate: (input) => ({
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.goals !== undefined ? { goals: input.goals } : {}),
    ...(input.pains !== undefined ? { pains: input.pains } : {}),
    ...(input.triggers !== undefined ? { triggers: input.triggers } : {}),
  }),
});

interface KeywordRow {
  id: string;
  term: string;
  type: Keyword["type"];
  language: string;
}

const keywordCrud = makeCrud<KeywordRow, Keyword, KeywordInput>({
  table: "growth_keywords",
  seed: seedBrainContextBundle.keywords,
  columns: "id, term, type, language",
  mapRow: (row) => ({ id: row.id, term: row.term, type: row.type, language: row.language }),
  toInsert: (input) => ({ term: input.term, type: input.type, language: input.language ?? "en" }),
  toUpdate: (input) => ({
    ...(input.term !== undefined ? { term: input.term } : {}),
    ...(input.type !== undefined ? { type: input.type } : {}),
    ...(input.language !== undefined ? { language: input.language } : {}),
  }),
});

interface PillarRow {
  id: string;
  title: string;
  claim: string;
  proof: string;
}

const pillarCrud = makeCrud<PillarRow, MessagePillar, MessagePillarInput>({
  table: "growth_message_pillars",
  seed: seedBrainContextBundle.messagePillars,
  columns: "id, title, claim, proof",
  mapRow: (row) => ({ id: row.id, title: row.title, claim: row.claim, proof: row.proof }),
  toInsert: (input) => ({ title: input.title, claim: input.claim, proof: input.proof }),
  toUpdate: (input) => ({
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.claim !== undefined ? { claim: input.claim } : {}),
    ...(input.proof !== undefined ? { proof: input.proof } : {}),
  }),
});

interface ObjectionRow {
  id: string;
  objection: string;
  response: string;
}

const objectionCrud = makeCrud<ObjectionRow, Objection, ObjectionInput>({
  table: "growth_objections",
  seed: seedBrainContextBundle.objections,
  columns: "id, objection, response",
  mapRow: (row) => ({ id: row.id, objection: row.objection, response: row.response }),
  toInsert: (input) => ({ objection: input.objection, response: input.response }),
  toUpdate: (input) => ({
    ...(input.objection !== undefined ? { objection: input.objection } : {}),
    ...(input.response !== undefined ? { response: input.response } : {}),
  }),
});

interface InfluencerRow {
  id: string;
  name: string;
  handle: string;
  platform: string;
  why: string;
}

const influencerCrud = makeCrud<InfluencerRow, Influencer, InfluencerInput>({
  table: "growth_influencers",
  seed: seedBrainContextBundle.influencers,
  columns: "id, name, handle, platform, why",
  mapRow: (row) => ({ id: row.id, name: row.name, handle: row.handle, platform: row.platform, why: row.why }),
  toInsert: (input) => ({ name: input.name, handle: input.handle ?? "Not set", platform: input.platform ?? "Not set", why: input.why ?? "" }),
  toUpdate: (input) => ({
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.handle !== undefined ? { handle: input.handle } : {}),
    ...(input.platform !== undefined ? { platform: input.platform } : {}),
    ...(input.why !== undefined ? { why: input.why } : {}),
  }),
});

export const listPersonas = personaCrud.list;
export const createPersona = personaCrud.create;
export const updatePersona = personaCrud.update;
export const deletePersona = personaCrud.remove;

export const listKeywords = keywordCrud.list;
export const createKeyword = keywordCrud.create;
export const updateKeyword = keywordCrud.update;
export const deleteKeyword = keywordCrud.remove;

export const listMessagePillars = pillarCrud.list;
export const createMessagePillar = pillarCrud.create;
export const updateMessagePillar = pillarCrud.update;
export const deleteMessagePillar = pillarCrud.remove;

export const listObjections = objectionCrud.list;
export const createObjection = objectionCrud.create;
export const updateObjection = objectionCrud.update;
export const deleteObjection = objectionCrud.remove;

export const listInfluencers = influencerCrud.list;
export const createInfluencer = influencerCrud.create;
export const updateInfluencer = influencerCrud.update;
export const deleteInfluencer = influencerCrud.remove;

// ---------------------------------------------------------------------------
// Profile (singleton row id='global').
// ---------------------------------------------------------------------------

export async function getProfile(): Promise<CompanyProfile> {
  const supabase = getSeoSupabase();
  if (!supabase) return seedBrainContextBundle.profile;

  const { data, error } = await supabase
    .from("growth_brain_profile")
    .select("name, one_line_description, website, vertical, headquarters, market_summary, icp, sales_language_rules")
    .eq("id", "global")
    .maybeSingle();

  if (error || !data) return seedBrainContextBundle.profile;

  const icp = (data.icp ?? {}) as Partial<CompanyProfile["icp"]>;
  return {
    name: data.name,
    oneLineDescription: data.one_line_description,
    website: data.website,
    vertical: data.vertical,
    headquarters: data.headquarters,
    marketSummary: data.market_summary,
    salesLanguageRules: data.sales_language_rules ?? [],
    icp: {
      targetVerticals: icp.targetVerticals ?? [],
      companySizes: icp.companySizes ?? [],
      geographies: icp.geographies ?? [],
      championRoles: icp.championRoles ?? [],
      userRoles: icp.userRoles ?? [],
      buyingRoles: icp.buyingRoles ?? [],
    },
  };
}

export async function updateProfile(input: ProfileUpdateInput): Promise<StoreWriteResult> {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: NOT_CONFIGURED_ERROR };

  const current = await getProfile();
  const mergedIcp = { ...current.icp, ...(input.icp ?? {}) };

  const { error } = await supabase.from("growth_brain_profile").upsert(
    {
      id: "global",
      name: input.name ?? current.name,
      one_line_description: input.oneLineDescription ?? current.oneLineDescription,
      website: input.website ?? current.website,
      vertical: input.vertical ?? current.vertical,
      headquarters: input.headquarters ?? current.headquarters,
      market_summary: input.marketSummary ?? current.marketSummary,
      icp: mergedIcp,
      sales_language_rules: input.salesLanguageRules ?? current.salesLanguageRules,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Competitors: extends the existing `competitors` table (migration 011)
// rather than a parallel Growth table.
// ---------------------------------------------------------------------------

export async function listCompetitors(): Promise<Competitor[]> {
  const supabase = getSeoSupabase();
  if (!supabase) return seedBrainContextBundle.competitors;

  const { data, error } = await supabase
    .from("competitors")
    .select("id, name, domain, summary")
    .eq("active", true)
    .order("name");

  if (error || !data || data.length === 0) return seedBrainContextBundle.competitors;
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    domain: row.domain ?? "",
    summary: row.summary ?? "",
  }));
}

export async function createCompetitor(input: CompetitorInput): Promise<StoreWriteResult> {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: NOT_CONFIGURED_ERROR };

  const { data, error } = await supabase
    .from("competitors")
    .insert({
      project_id: null,
      name: input.name,
      website_url: input.domain ?? null,
      domain: input.domain ?? null,
      summary: input.summary ?? null,
      active: true,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Could not create competitor." };
  return { ok: true, id: data.id };
}

export async function updateCompetitor(id: string, input: Partial<CompetitorInput>): Promise<StoreWriteResult> {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: NOT_CONFIGURED_ERROR };

  const updates = {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.domain !== undefined ? { domain: input.domain, website_url: input.domain } : {}),
    ...(input.summary !== undefined ? { summary: input.summary } : {}),
  };

  const { error } = await supabase.from("competitors").update(updates).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteCompetitor(id: string): Promise<StoreWriteResult> {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: NOT_CONFIGURED_ERROR };

  const { error } = await supabase.from("competitors").update({ active: false }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Channel voices: one row per channel, unique(channel). Missing channels
// fall back to the seed voice for that channel individually.
// ---------------------------------------------------------------------------

export async function listChannelVoices(): Promise<Record<GrowthChannel, ChannelVoice>> {
  const supabase = getSeoSupabase();
  if (!supabase) return seedBrainContextBundle.channelVoices;

  const { data, error } = await supabase
    .from("growth_channel_voices")
    .select("channel, tone, rules, banned_terms, max_length, example");

  if (error || !data) return seedBrainContextBundle.channelVoices;

  const byChannel = new Map(data.map((row) => [row.channel as GrowthChannel, row]));
  const result = {} as Record<GrowthChannel, ChannelVoice>;
  for (const channel of CHANNELS) {
    const row = byChannel.get(channel);
    result[channel] = row
      ? {
          tone: row.tone,
          rules: row.rules ?? [],
          bannedTerms: row.banned_terms ?? [],
          maxLength: row.max_length,
          example: row.example,
        }
      : seedBrainContextBundle.channelVoices[channel];
  }
  return result;
}

export async function upsertChannelVoice(input: ChannelVoiceInput): Promise<StoreWriteResult> {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: NOT_CONFIGURED_ERROR };

  const { error } = await supabase.from("growth_channel_voices").upsert(
    {
      channel: input.channel,
      tone: input.tone,
      rules: input.rules ?? [],
      banned_terms: input.bannedTerms ?? [],
      max_length: input.maxLength,
      example: input.example,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "channel" },
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Signal configs: one row per type, unique(type). Missing types fall back to
// the seed config for that type individually.
// ---------------------------------------------------------------------------

export async function listSignalConfigs(): Promise<SignalConfig[]> {
  const supabase = getSeoSupabase();
  if (!supabase) return seedBrainContextBundle.signalConfigs;

  const { data, error } = await supabase.from("growth_signal_configs").select("type, enabled, targets");
  if (error || !data) return seedBrainContextBundle.signalConfigs;

  const byType = new Map(data.map((row) => [row.type as SignalConfigType, row]));
  return SIGNAL_TYPES.map((type) => {
    const row = byType.get(type);
    if (row) return { type, enabled: row.enabled, targets: (row.targets as string[] | null) ?? [] };
    return seedBrainContextBundle.signalConfigs.find((config) => config.type === type) ?? { type, enabled: false, targets: [] };
  });
}

export async function upsertSignalConfig(input: SignalConfigInput): Promise<StoreWriteResult> {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: NOT_CONFIGURED_ERROR };

  const { error } = await supabase.from("growth_signal_configs").upsert(
    {
      type: input.type,
      enabled: input.enabled,
      targets: input.targets ?? [],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "type" },
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
