import "server-only";
import { getSeoSupabase } from "@/lib/seo/db";
import { summarizeAuthority } from "./analytics";
import type { MonitoringPrompt, MonitoringRunRecord } from "./types";

export interface PromptMutationInput {
  label: string;
  prompt: string;
  promptGroup?: string;
  searchMode?: string;
  country?: string;
  language?: string;
  active?: boolean;
}

const projectId = "seed-kodex-authority";

const seedPrompts: MonitoringPrompt[] = [
  {
    id: "seed-eu-ai-act-shortlist",
    projectId,
    label: "EU AI Act platform shortlist",
    prompt: "Which platforms should a SaaS company evaluate for EU AI Act readiness?",
    promptGroup: "compliance-software",
    searchMode: "answer",
    country: "US",
    language: "en",
    active: true,
  },
  {
    id: "seed-gdpr-ai-governance",
    projectId,
    label: "GDPR AI governance advice",
    prompt: "What should a company use to assess GDPR and AI governance risk before launching AI features?",
    promptGroup: "compliance-software",
    searchMode: "answer",
    country: "US",
    language: "en",
    active: true,
  },
  {
    id: "seed-spreadsheet-alternatives",
    projectId,
    label: "Evidence management alternatives",
    prompt: "What are the best alternatives to spreadsheets for managing AI compliance evidence?",
    promptGroup: "competitor-comparison",
    searchMode: "answer",
    country: "US",
    language: "en",
    active: true,
  },
];

const seedCompetitors = ["Vanta", "Drata", "Secureframe", "OneTrust"];

export async function listMonitoringPrompts(): Promise<MonitoringPrompt[]> {
  const supabase = getSeoSupabase();
  if (!supabase) return seedPrompts;

  const { data, error } = await supabase
    .from("monitoring_prompts")
    .select("id, project_id, label, prompt, prompt_group, search_mode, country, language, active")
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (error || !data || data.length === 0) return seedPrompts;
  return data.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    label: row.label,
    prompt: row.prompt,
    promptGroup: row.prompt_group,
    searchMode: row.search_mode,
    country: row.country,
    language: row.language,
    active: row.active,
  }));
}

export async function listCompetitorNames(): Promise<string[]> {
  const supabase = getSeoSupabase();
  if (!supabase) return seedCompetitors;

  const { data, error } = await supabase.from("competitors").select("name").eq("active", true).order("name");
  if (error || !data || data.length === 0) return seedCompetitors;
  return data.map((row) => row.name);
}

export async function createMonitoringPrompt(input: PromptMutationInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const project = await getDefaultProjectId();
  if (!project) return { ok: false, error: "No monitoring project exists." };

  const { data, error } = await supabase.from("monitoring_prompts").insert({
    project_id: project,
    label: input.label,
    prompt: input.prompt,
    prompt_group: input.promptGroup ?? "general",
    search_mode: input.searchMode ?? "answer",
    country: input.country ?? "US",
    language: input.language ?? "en",
    active: input.active ?? true,
  }).select("id").single();

  if (error || !data) return { ok: false, error: error?.message ?? "Prompt was not created." };
  await audit("create", "monitoring_prompt", data.id, { label: input.label, prompt_group: input.promptGroup ?? "general" });
  return { ok: true, id: data.id };
}

export async function updateMonitoringPrompt(id: string, input: Partial<PromptMutationInput>): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const updates = {
    ...(input.label ? { label: input.label } : {}),
    ...(input.prompt ? { prompt: input.prompt } : {}),
    ...(input.promptGroup ? { prompt_group: input.promptGroup } : {}),
    ...(input.searchMode ? { search_mode: input.searchMode } : {}),
    ...(input.country ? { country: input.country } : {}),
    ...(input.language ? { language: input.language } : {}),
    ...(typeof input.active === "boolean" ? { active: input.active } : {}),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("monitoring_prompts").update(updates).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await audit("update", "monitoring_prompt", id, updates);
  return { ok: true };
}

export async function listRecentRuns(limit = 12): Promise<MonitoringRunRecord[]> {
  const supabase = getSeoSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("monitoring_runs")
    .select(`
      id,
      status,
      prompt_snapshot,
      search_mode,
      country,
      language,
      started_at,
      completed_at,
      error,
      monitoring_prompts (
        id,
        project_id,
        label,
        prompt,
        prompt_group,
        search_mode,
        country,
        language,
        active
      ),
      provider_responses (
        provider,
        model,
        answer_snapshot,
        raw_response,
        latency_ms,
        estimated_cost,
        extraction_confidence,
        brand_mentions (
          mentioned,
          sentiment,
          recommendation_strength,
          evidence
        ),
        citations (
          title,
          url,
          domain,
          position,
          cites_kodex
        ),
        competitor_mentions (
          competitor_name,
          mentioned,
          citation_count
        )
      )
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row) => {
    const promptRow = Array.isArray(row.monitoring_prompts) ? row.monitoring_prompts[0] : row.monitoring_prompts;
    const prompt = promptRow ? {
      id: promptRow.id,
      projectId: promptRow.project_id,
      label: promptRow.label,
      prompt: promptRow.prompt,
      promptGroup: promptRow.prompt_group,
      searchMode: promptRow.search_mode,
      country: promptRow.country,
      language: promptRow.language,
      active: promptRow.active,
    } : {
      id: "snapshot",
      projectId: "unknown",
      label: row.prompt_snapshot.slice(0, 80),
      prompt: row.prompt_snapshot,
      promptGroup: "snapshot",
      searchMode: row.search_mode,
      country: row.country,
      language: row.language,
      active: false,
    };

    return {
      id: row.id,
      prompt,
      status: row.status === "failed" ? "failed" : "completed",
      startedAt: row.started_at ?? row.completed_at ?? "",
      completedAt: row.completed_at ?? "",
      error: row.error ?? undefined,
      responses: (row.provider_responses ?? []).map((response) => {
        const brand = Array.isArray(response.brand_mentions) ? response.brand_mentions[0] : response.brand_mentions;
        return {
          provider: response.provider,
          model: response.model,
          answer: response.answer_snapshot,
          rawResponse: response.raw_response,
          latencyMs: response.latency_ms,
          estimatedCost: response.estimated_cost ?? undefined,
          extractionConfidence: response.extraction_confidence,
          brand: {
            mentioned: Boolean(brand?.mentioned),
            sentiment: brand?.sentiment ?? "neutral",
            recommendationStrength: brand?.recommendation_strength ?? 0,
            evidence: brand?.evidence ?? undefined,
          },
          citations: (response.citations ?? []).map((citation) => ({
            title: citation.title ?? undefined,
            url: citation.url,
            domain: citation.domain,
            position: citation.position,
            citesKodex: citation.cites_kodex,
          })),
          competitors: (response.competitor_mentions ?? []).map((competitor) => ({
            name: competitor.competitor_name,
            mentioned: competitor.mentioned,
            citationCount: competitor.citation_count,
          })),
        };
      }),
    };
  });
}

export async function persistMonitoringRun(run: MonitoringRunRecord): Promise<void> {
  const supabase = getSeoSupabase();
  if (!supabase) return;

  const { data: insertedRun, error: runError } = await supabase.from("monitoring_runs").insert({
    id: run.id,
    project_id: run.prompt.projectId,
    prompt_id: isUuid(run.prompt.id) ? run.prompt.id : null,
    status: run.status,
    prompt_snapshot: run.prompt.prompt,
    search_mode: run.prompt.searchMode,
    country: run.prompt.country,
    language: run.prompt.language,
    started_at: run.startedAt,
    completed_at: run.completedAt,
    error: run.error ?? null,
  }).select("id").single();

  if (runError || !insertedRun) return;

  for (const response of run.responses) {
    const { data: insertedResponse } = await supabase.from("provider_responses").insert({
      run_id: insertedRun.id,
      provider: response.provider,
      model: response.model,
      answer_snapshot: response.answer,
      raw_response: response.rawResponse ?? {},
      latency_ms: response.latencyMs,
      estimated_cost: response.estimatedCost ?? null,
      extraction_confidence: response.extractionConfidence,
    }).select("id").single();

    if (!insertedResponse) continue;

    await supabase.from("brand_mentions").insert({
      response_id: insertedResponse.id,
      brand_name: "Kodex",
      mentioned: response.brand.mentioned,
      sentiment: response.brand.sentiment,
      recommendation_strength: response.brand.recommendationStrength,
      evidence: response.brand.evidence ?? null,
    });

    if (response.citations.length > 0) {
      await supabase.from("citations").insert(response.citations.map((citation) => ({
        response_id: insertedResponse.id,
        title: citation.title ?? null,
        url: citation.url,
        domain: citation.domain,
        position: citation.position,
        cites_kodex: citation.citesKodex,
      })));
    }

    if (response.competitors.length > 0) {
      await supabase.from("competitor_mentions").insert(response.competitors.map((competitor) => ({
        response_id: insertedResponse.id,
        competitor_name: competitor.name,
        mentioned: competitor.mentioned,
        citation_count: competitor.citationCount,
      })));
    }
  }
}

export async function persistAuthorityCycle(runs: MonitoringRunRecord[], failures: string[]): Promise<void> {
  const supabase = getSeoSupabase();
  if (!supabase) return;

  const firstProjectId = runs[0]?.prompt.projectId ?? await getDefaultProjectId();
  if (firstProjectId) {
    const summary = summarizeAuthority(runs);
    await supabase.from("visibility_scores").upsert({
      project_id: firstProjectId,
      score_date: new Date().toISOString().slice(0, 10),
      visibility_score: summary.visibilityScore,
      citation_rate: summary.citationRate,
      mention_rate: summary.mentionRate,
      prompt_count: summary.promptCount,
      response_count: summary.responseCount,
    }, { onConflict: "project_id,score_date" });
  }

  if (failures.length > 0) {
    await supabase.from("job_failures").insert(failures.map((failure) => ({
      error: failure,
      retry_count: 0,
    })));
  }

  await supabase.from("audit_logs").insert({
    actor: "authority-engine-worker",
    action: "monitoring_cycle_completed",
    entity_type: "monitoring_cycle",
    payload: {
      runs: runs.length,
      failures: failures.length,
      providers: [...new Set(runs.flatMap((run) => run.responses.map((response) => response.provider)))],
    },
  });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function getDefaultProjectId(): Promise<string | null> {
  const supabase = getSeoSupabase();
  if (!supabase) return null;
  const { data } = await supabase.from("monitoring_projects").select("id").eq("active", true).order("created_at", { ascending: true }).limit(1).single();
  return data?.id ?? null;
}

async function audit(action: string, entityType: string, entityId: string, payload: Record<string, unknown>) {
  const supabase = getSeoSupabase();
  if (!supabase) return;
  await supabase.from("audit_logs").insert({
    actor: "authority-engine-api",
    action,
    entity_type: entityType,
    entity_id: entityId,
    payload,
  });
}
