import "server-only";
import { randomUUID } from "node:crypto";
import { getSeoSupabase } from "@/lib/seo/db";
import { getAllSeoPages } from "@/lib/seo/content";
import { checkApprovedSources, searchConsoleStatus } from "@/lib/seo/source-intelligence";
import { calculateOpportunityScore, demandLabel, normalizeQuery, recommendedDecision } from "./opportunity-scoring";
import { getProviderStatuses } from "./providers";
import { contentGapScore, isSemanticDuplicate } from "./opportunity-scoring";

export interface AuthorityOpportunity {
  id: string;
  query: string;
  description?: string | null;
  framework?: string | null;
  topicCluster: string;
  intent: string;
  buyerStage: string;
  country: string;
  language: string;
  source: string;
  searchDemandValue?: number | null;
  searchDemandLabel: string;
  demandSource: string;
  demandIntegrity: string;
  priorityScore: number;
  recommendedDecision: string;
  currentDecision: string;
  lastSeenAt: string;
  status: string;
}

export interface OpportunityFilters {
  search?: string | null;
  framework?: string | null;
  intent?: string | null;
  country?: string | null;
  language?: string | null;
  status?: string | null;
  source?: string | null;
  sort?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  limit?: number;
  offset?: number;
}

const euSeedQuestions = [
  ["EU AI Act Article 50 compliance checklist", "EU AI Act", "AI Act", "Commercial", "decision"],
  ["Does my chatbot need an AI disclosure?", "EU AI Act", "AI transparency", "Decision", "decision"],
  ["EU AI Act compliance software for SaaS", "EU AI Act", "EU SaaS", "Commercial", "decision"],
  ["Article 50 AI Act penalties", "EU AI Act", "AI Act", "Risk", "risk"],
  ["Vanta alternative for European companies", "EU AI Act", "Comparison", "Commercial", "decision"],
  ["NIS2 evidence requirements Germany", "NIS2", "NIS2", "Implementation", "implementation"],
  ["GDPR and EU AI Act overlap", "GDPR", "AI privacy", "Research", "awareness"],
  ["AI governance evidence management", "EU AI Act", "Evidence", "Commercial", "decision"],
] as const;

export async function listOpportunities(filters: OpportunityFilters = {}) {
  const supabase = getSeoSupabase();
  if (!supabase) return { items: [] as AuthorityOpportunity[], total: 0, databaseConfigured: false };

  let query = supabase.from("authority_opportunities").select("*", { count: "exact" });
  if (filters.search) query = query.ilike("query", `%${filters.search}%`);
  if (filters.framework) query = query.eq("framework", filters.framework);
  if (filters.intent) query = query.eq("intent", filters.intent);
  if (filters.country) query = query.eq("country", filters.country);
  if (filters.language) query = query.eq("language", filters.language);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.source) query = query.eq("source", filters.source);
  if (filters.dateFrom) query = query.gte("last_seen_at", filters.dateFrom);
  if (filters.dateTo) query = query.lte("last_seen_at", filters.dateTo);

  const ascending = filters.sort === "priority-low";
  query = query
    .order("priority_score", { ascending })
    .order("last_seen_at", { ascending: false })
    .range(filters.offset ?? 0, (filters.offset ?? 0) + (filters.limit ?? 25) - 1);

  const { data, count, error } = await query;
  if (error || !data) return { items: [] as AuthorityOpportunity[], total: 0, databaseConfigured: true, error: error?.message };

  return {
    items: data.map(mapOpportunity),
    total: count ?? data.length,
    databaseConfigured: true,
  };
}

export async function getOpportunity(id: string) {
  const supabase = getSeoSupabase();
  if (!supabase) return null;
  const { data } = await supabase.from("authority_opportunities").select("*").eq("id", id).maybeSingle();
  return data ? mapOpportunity(data) : null;
}

export async function listDiscoveryRuns(limit = 25) {
  const supabase = getSeoSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("authority_discovery_runs")
    .select("id,idempotency_key,run_type,trigger_type,actual_start_at,completed_at,status,items_processed,items_created,items_updated,items_skipped,duplicate_count,failures,duration_ms")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function createOpportunity(input: { query: string; framework?: string; topicCluster?: string; intent?: string; country?: string; language?: string; actor?: string }) {
  const candidate = scoreCandidate({
    query: input.query,
    framework: input.framework ?? "EU AI Act",
    topicCluster: input.topicCluster ?? input.framework ?? "General",
    intent: input.intent ?? "Research",
    buyerStage: input.intent === "Commercial" ? "decision" : "awareness",
    country: input.country ?? "DE",
    language: input.language ?? "en",
    source: "manual",
    sourceReference: "admin",
  });
  const result = await upsertOpportunity(candidate);
  await audit(input.actor, "create", "authority_opportunity", result.id, { query: input.query });
  return result;
}

export async function runOpportunityDiscovery(options: { actor?: string; runType?: string; idempotencyKey?: string } = {}) {
  const supabase = getSeoSupabase();
  if (!supabase) {
    return { status: "database-unavailable", itemsProcessed: 0, itemsCreated: 0, itemsUpdated: 0, itemsSkipped: 0, providerFailures: ["Supabase is not configured."] };
  }

  const projectId = await getDefaultProjectId();
  if (!projectId) return { status: "failed", itemsProcessed: 0, itemsCreated: 0, itemsUpdated: 0, itemsSkipped: 0, providerFailures: ["No monitoring project exists."] };

  const idempotencyKey = options.idempotencyKey ?? `${options.runType ?? "manual"}-${new Date().toISOString().slice(0, 10)}`;
  const started = Date.now();
  const { data: existingRun } = await supabase.from("authority_discovery_runs").select("id,status").eq("idempotency_key", idempotencyKey).maybeSingle();
  if (existingRun?.status === "completed") {
    return { status: "skipped", itemsProcessed: 0, itemsCreated: 0, itemsUpdated: 0, itemsSkipped: 1, providerFailures: [] };
  }

  const { data: run } = await supabase.from("authority_discovery_runs").upsert({
    project_id: projectId,
    idempotency_key: idempotencyKey,
    run_type: options.runType ?? "manual",
    actual_start_at: new Date().toISOString(),
    status: "running",
  }, { onConflict: "idempotency_key" }).select("id").single();

  const pages = await getAllSeoPages();
  const sourceChecks = await checkApprovedSources();
  const providerStatuses = getProviderStatuses();
  const providerFailures = providerStatuses.filter((provider) => !provider.configured).map((provider) => `${provider.name}: missing ${provider.missing.join(", ")}`);
  const searchConsole = searchConsoleStatus();

  const candidates = [
    ...euSeedQuestions.map(([query, framework, topicCluster, intent, buyerStage]) => scoreCandidate({
      query,
      framework,
      topicCluster,
      intent,
      buyerStage,
      country: framework === "NIS2" ? "DE" : "EU",
      language: "en",
      source: "configured_topic",
      sourceReference: "authority-engine-seed",
    })),
    ...pages.slice(0, 16).map((page) => scoreCandidate({
      query: `${page.primaryKeyword ?? page.title} implementation verification`,
      framework: page.framework ?? "EU AI Act",
      topicCluster: page.framework ?? "Compliance",
      intent: page.searchIntent ?? "Implementation",
      buyerStage: "implementation",
      country: page.jurisdiction === "Germany" ? "DE" : "EU",
      language: page.language,
      source: "indexed_content",
      sourceReference: page.slug,
      existingContentId: page.id,
    })),
    ...sourceChecks.filter((check) => check.status === "changed").map((check) => scoreCandidate({
      query: `${check.name} compliance changes`,
      framework: check.name.includes("AI") ? "EU AI Act" : "GDPR",
      topicCluster: "Regulatory change",
      intent: "Risk",
      buyerStage: "awareness",
      country: "EU",
      language: "en",
      source: "official_source_monitor",
      sourceReference: check.url,
    })),
  ];

  let itemsCreated = 0;
  let itemsUpdated = 0;
  let itemsSkipped = 0;
  let duplicateCount = 0;

  for (const candidate of candidates) {
    const result = await upsertOpportunity({ ...candidate, projectId });
    if (result.action === "created") itemsCreated += 1;
    else if (result.action === "updated") itemsUpdated += 1;
    else {
      itemsSkipped += 1;
      if (result.action === "duplicate") duplicateCount += 1;
    }

    if (run?.id) {
      await supabase.from("authority_discovery_run_items").insert({
        run_id: run.id,
        opportunity_id: result.id,
        normalized_query: candidate.normalizedQuery,
        action: result.action,
        payload: { source: candidate.source, demand_integrity: candidate.demandIntegrity },
      });
    }
  }

  const durationMs = Date.now() - started;
  if (run?.id) {
    await supabase.from("authority_discovery_runs").update({
      status: providerFailures.length > 0 ? "partial" : "completed",
      completed_at: new Date().toISOString(),
      items_processed: candidates.length,
      items_created: itemsCreated,
      items_updated: itemsUpdated,
      items_skipped: itemsSkipped,
      duplicate_count: duplicateCount,
      provider_failures: providerFailures,
      failures: providerFailures,
      trigger_type: options.runType ?? "manual",
      duration_ms: durationMs,
      error_summary: providerFailures.join("\n") || null,
    }).eq("id", run.id);
  }

  await audit(options.actor, "run", "authority_discovery", run?.id ?? idempotencyKey, {
    itemsProcessed: candidates.length,
    itemsCreated,
    itemsUpdated,
    itemsSkipped,
    searchConsole: searchConsole.status,
  });

  if (itemsCreated > 0) {
    await notify("discovery", "info", "Discovery run completed", `${itemsCreated} new opportunities discovered.`);
  }

  return { status: providerFailures.length > 0 ? "partial" : "completed", itemsProcessed: candidates.length, itemsCreated, itemsUpdated, itemsSkipped, duplicateCount, providerFailures, durationMs };
}

export async function applyOpportunityDecision(id: string, decision: string, actor?: string, payload: Record<string, unknown> = {}) {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const opportunity = await getOpportunity(id);
  if (!opportunity) return { ok: false, error: "Opportunity not found." };

  const status = decision === "Ignore" ? "ignored" : decision === "Merge" ? "merged" : "in_progress";
  await supabase.from("authority_opportunities").update({ current_decision: decision, status, updated_at: new Date().toISOString() }).eq("id", id);
  await supabase.from("authority_opportunity_decisions").insert({ opportunity_id: id, decision, actor, payload });

  if (decision === "Build") await createEditorialFromOpportunity(opportunity, actor);
  if (decision === "Research") await createKnowledgeTask(opportunity, actor);
  if (decision === "Expand") await createEditorialFromOpportunity(opportunity, actor, "Expand existing content");
  if (decision === "Ignore") await notify("opportunity", "info", "Opportunity ignored", opportunity.query);
  if (decision === "Archive") await supabase.from("authority_opportunities").update({ status: "archived" }).eq("id", id);

  await audit(actor, "decision", "authority_opportunity", id, { decision, ...payload });
  return { ok: true };
}

export async function recalculateOpportunity(id: string, actor?: string) {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const opportunity = await getOpportunity(id);
  if (!opportunity) return { ok: false, error: "Opportunity not found." };
  const gap = contentGapScore(Boolean(opportunity.status === "in_progress"), opportunity.priorityScore);
  const candidate = scoreCandidate({
    query: opportunity.query,
    framework: opportunity.framework ?? "EU AI Act",
    topicCluster: opportunity.topicCluster,
    intent: opportunity.intent,
    buyerStage: opportunity.buyerStage,
    country: opportunity.country,
    language: opportunity.language,
    source: "manual_recalculation",
    sourceReference: id,
  });
  await supabase.from("authority_opportunities").update({
    content_feasibility_score: 100 - gap,
    priority_score: candidate.priorityScore,
    recommended_decision: candidate.recommendedDecision,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  await audit(actor, "recalculate", "authority_opportunity", id, { priorityScore: candidate.priorityScore, contentGapScore: gap });
  return { ok: true, priorityScore: candidate.priorityScore, contentGapScore: gap };
}

export async function mergeOpportunity(id: string, canonicalId: string, actor?: string) {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  await supabase.from("authority_opportunity_duplicates").insert({
    canonical_opportunity_id: canonicalId,
    duplicate_opportunity_id: id,
    similarity_score: 1,
    reason: "Manual merge",
  });
  await supabase.from("authority_opportunities").update({ duplicate_of: canonicalId, status: "merged", current_decision: "Merge" }).eq("id", id);
  await audit(actor, "merge", "authority_opportunity", id, { canonicalId });
  return { ok: true };
}

function scoreCandidate(input: {
  query: string;
  framework: string;
  topicCluster: string;
  intent: string;
  buyerStage: string;
  country: string;
  language: string;
  source: string;
  sourceReference: string;
  existingContentId?: string;
  projectId?: string;
}) {
  const commercial = /software|platform|alternative|tool/i.test(input.query);
  const risk = /penalt|fine|risk|requirement|obligation/i.test(input.query);
  const buyerIntentScore = commercial ? 92 : input.intent === "Decision" ? 84 : 62;
  const productRelevanceScore = commercial ? 96 : 80;
  const regulatoryUrgencyScore = risk || /AI Act|NIS2|GDPR/i.test(input.framework) ? 82 : 58;
  const demandSignalScore = input.source === "indexed_content" ? 50 : 45;
  const llmVisibilityGapScore = 70;
  const competitorGapScore = /alternative|vanta|drata/i.test(input.query) ? 88 : 65;
  const contentFeasibilityScore = input.existingContentId ? 82 : 74;
  const priorityScore = calculateOpportunityScore({ buyerIntentScore, productRelevanceScore, regulatoryUrgencyScore, demandSignalScore, llmVisibilityGapScore, competitorGapScore, contentFeasibilityScore });

  return {
    projectId: input.projectId,
    query: input.query,
    normalizedQuery: normalizeQuery(input.query),
    description: `Opportunity generated from ${input.source}. Demand is not shown as a numeric volume unless verified by a named data source.`,
    framework: input.framework,
    topicCluster: input.topicCluster,
    intent: input.intent,
    buyerStage: input.buyerStage,
    country: input.country,
    language: input.language,
    source: input.source,
    sourceReference: input.sourceReference,
    searchDemandValue: null,
    searchDemandLabel: demandLabel(demandSignalScore),
    demandSource: input.source === "indexed_content" ? "internal query frequency" : "modeled internal signal",
    demandIntegrity: input.source === "indexed_content" ? "measured" : "modeled",
    competitionScore: 50,
    regulatoryUrgencyScore,
    productRelevanceScore,
    buyerIntentScore,
    llmVisibilityGapScore,
    competitorGapScore,
    contentFeasibilityScore,
    priorityScore,
    recommendedDecision: recommendedDecision(priorityScore),
    currentDecision: recommendedDecision(priorityScore),
    existingContentId: input.existingContentId,
  };
}

async function upsertOpportunity(candidate: ReturnType<typeof scoreCandidate>) {
  const supabase = getSeoSupabase();
  if (!supabase) return { id: randomUUID(), action: "skipped" as const };
  const projectId = candidate.projectId ?? await getDefaultProjectId();
  if (!projectId) return { id: randomUUID(), action: "skipped" as const };

  const { data: existing } = await supabase
    .from("authority_opportunities")
    .select("id")
    .eq("project_id", projectId)
    .eq("normalized_query", candidate.normalizedQuery)
    .eq("country", candidate.country)
    .eq("language", candidate.language)
    .maybeSingle();

  if (!existing?.id) {
    const { data: possibleDuplicates } = await supabase
      .from("authority_opportunities")
      .select("id,query")
      .eq("project_id", projectId)
      .eq("country", candidate.country)
      .eq("language", candidate.language)
      .limit(100);
    const duplicate = possibleDuplicates?.find((item) => isSemanticDuplicate(item.query, candidate.query));
    if (duplicate) {
      await supabase.from("authority_opportunity_duplicates").upsert({
        canonical_opportunity_id: duplicate.id,
        duplicate_opportunity_id: duplicate.id,
        similarity_score: 0.82,
        reason: `Semantic duplicate candidate skipped: ${candidate.query}`,
      }, { onConflict: "canonical_opportunity_id,duplicate_opportunity_id" });
      return { id: duplicate.id, action: "duplicate" as const };
    }
  }

  const row = {
    project_id: projectId,
    query: candidate.query,
    normalized_query: candidate.normalizedQuery,
    description: candidate.description,
    summary: candidate.description,
    framework: candidate.framework,
    topic_cluster: candidate.topicCluster,
    intent: candidate.intent,
    buyer_stage: candidate.buyerStage,
    country: candidate.country,
    language: candidate.language,
    source: candidate.source,
    source_type: candidate.source,
    source_reference: candidate.sourceReference,
    search_demand_value: candidate.searchDemandValue,
    demand_value: candidate.searchDemandValue,
    search_demand_label: candidate.searchDemandLabel,
    demand_label: candidate.searchDemandLabel,
    demand_source: candidate.demandSource,
    demand_integrity: candidate.demandIntegrity,
    demand_measurement_type: candidate.demandIntegrity,
    competition_score: candidate.competitionScore,
    regulatory_urgency_score: candidate.regulatoryUrgencyScore,
    product_relevance_score: candidate.productRelevanceScore,
    buyer_intent_score: candidate.buyerIntentScore,
    llm_visibility_gap_score: candidate.llmVisibilityGapScore,
    competitor_gap_score: candidate.competitorGapScore,
    content_feasibility_score: candidate.contentFeasibilityScore,
    priority_score: candidate.priorityScore,
    recommended_decision: candidate.recommendedDecision,
    current_decision: candidate.currentDecision,
    existing_content_id: candidate.existingContentId ?? null,
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    await supabase.from("authority_opportunities").update(row).eq("id", existing.id);
    return { id: existing.id, action: "updated" as const };
  }

  const { data } = await supabase.from("authority_opportunities").insert(row).select("id").single();
  if (data?.id) {
    await supabase.from("authority_opportunity_sources").insert({
      opportunity_id: data.id,
      source: candidate.source,
      source_reference: candidate.sourceReference,
      evidence: { demand_integrity: candidate.demandIntegrity },
    });
  }
  return { id: data?.id ?? randomUUID(), action: data?.id ? "created" as const : "skipped" as const };
}

async function createEditorialFromOpportunity(opportunity: AuthorityOpportunity, actor?: string, note = "New editorial brief") {
  const supabase = getSeoSupabase();
  if (!supabase) return;
  const { data } = await supabase.from("authority_editorial_items").insert({
    opportunity_id: opportunity.id,
    title: opportunity.query,
    content_type: opportunity.currentDecision === "Expand" ? "content improvement" : "article",
    framework: opportunity.framework,
    target_audience: "Compliance and product leaders",
    primary_query: opportunity.query,
    supporting_queries: [],
    commercial_intent: opportunity.intent,
    status: "proposed",
    created_by: actor,
  }).select("id").single();
  if (data?.id) {
    await supabase.from("authority_editorial_briefs").insert({
      editorial_item_id: data.id,
      brief: { source: "opportunity_decision", note, opportunity_id: opportunity.id },
      outline: `Answer the query: ${opportunity.query}\nPreserve official regulatory citations and flag unsupported claims.`,
    });
  }
}

async function createKnowledgeTask(opportunity: AuthorityOpportunity, actor?: string) {
  const supabase = getSeoSupabase();
  if (!supabase) return;
  const { data } = await supabase.from("authority_knowledge_sources").insert({
    title: `Research: ${opportunity.query}`,
    source_organization: "Kodex research",
    source_type: "verified Kodex research notes",
    jurisdiction: opportunity.country,
    framework: opportunity.framework,
    official_url: `internal://research/${opportunity.id}`,
    verification_status: "unverified",
    summary: opportunity.description,
    created_by: actor,
  }).select("id").single();
  if (data?.id) {
    await supabase.from("authority_knowledge_links").insert({ knowledge_source_id: data.id, opportunity_id: opportunity.id, relationship: "researches" });
  }
}

async function getDefaultProjectId() {
  const supabase = getSeoSupabase();
  if (!supabase) return null;
  const { data } = await supabase.from("monitoring_projects").select("id").eq("active", true).order("created_at", { ascending: true }).limit(1).single();
  return data?.id ?? null;
}

async function audit(actor: string | undefined, action: string, entityType: string, entityId: string, payload: Record<string, unknown>) {
  const supabase = getSeoSupabase();
  if (!supabase) return;
  await supabase.from("audit_logs").insert({ actor, action, entity_type: entityType, entity_id: entityId, payload });
}

async function notify(category: string, severity: string, title: string, body: string) {
  const supabase = getSeoSupabase();
  if (!supabase) return;
  await supabase.from("authority_notifications").insert({ category, severity, title, body });
}

interface OpportunityRow {
  id: string;
  query: string;
  description?: string | null;
  framework?: string | null;
  topic_cluster: string;
  intent: string;
  buyer_stage: string;
  country: string;
  language: string;
  source: string;
  search_demand_value?: number | null;
  search_demand_label: string;
  demand_label?: string;
  demand_source: string;
  demand_integrity: string;
  priority_score: number;
  recommended_decision: string;
  current_decision: string;
  last_seen_at: string;
  status: string;
}

function mapOpportunity(row: OpportunityRow): AuthorityOpportunity {
  return {
    id: row.id,
    query: row.query,
    description: row.description,
    framework: row.framework,
    topicCluster: row.topic_cluster,
    intent: row.intent,
    buyerStage: row.buyer_stage,
    country: row.country,
    language: row.language,
    source: row.source,
    searchDemandValue: row.search_demand_value,
    searchDemandLabel: row.search_demand_label ?? row.demand_label,
    demandSource: row.demand_source,
    demandIntegrity: row.demand_integrity,
    priorityScore: row.priority_score,
    recommendedDecision: row.recommended_decision,
    currentDecision: row.current_decision,
    lastSeenAt: row.last_seen_at,
    status: row.status,
  };
}
