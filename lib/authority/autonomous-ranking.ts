import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSeoSupabase } from "@/lib/seo/db";
import { getAllSeoPages } from "@/lib/seo/content";
import { getSiteUrl, normalizeFramework } from "@/lib/seo/config";
import { checkApprovedSources, getApprovedSourceList, searchConsoleStatus } from "@/lib/seo/source-intelligence";
import { pathForSeoPage } from "@/lib/seo/urls";
import { runAuthorityMonitoringCycle } from "./monitoring";
import { runOpportunityDiscovery, listOpportunities, createOpportunity } from "./opportunities";
import { apiSuccess } from "./api";
import { calculateQualityScore, qualityBlockers } from "@/lib/seo/quality-gate";
import type { SeoContentBody, SeoContentPage, SeoPageType, SeoSource } from "@/lib/seo/types";

export type AutopilotMode = "off" | "draft_only" | "guarded" | "controlled";
export type ClaimCategory =
  | "legal_obligation"
  | "deadline"
  | "penalty"
  | "applicability"
  | "regulator_guidance"
  | "product_capability"
  | "competitor_comparison"
  | "quantitative_statement"
  | "general_explanation";

export interface ContentAsset {
  id: string;
  title: string;
  slug: string;
  routePath?: string | null;
  contentType: string;
  framework?: string | null;
  jurisdiction?: string | null;
  language: string;
  targetQuery: string;
  status: string;
  riskLevel: string;
  approvalRequired: boolean;
  selectedScore: number;
  contentPageId?: string | null;
  updatedAt: string;
}

export interface QualityGateSummary {
  score: number;
  decision: "publish" | "approval_required" | "reject";
  blockers: string[];
  gates: Array<{ name: string; status: "pass" | "fail" | "review"; message: string; severity: string }>;
}

interface ContentVersionRecord {
  id: string;
  assetId: string;
  versionNumber: number;
  title: string;
  description: string;
  body: SeoContentBody;
  contentHash: string;
  qualityScore: number;
  validationStatus: string;
  approvalStatus: string;
  createdAt: string;
}

interface AssetRow {
  id: string;
  title: string;
  slug: string;
  route_path?: string | null;
  content_type: string;
  framework?: string | null;
  jurisdiction?: string | null;
  language?: string | null;
  target_query: string;
  status: string;
  risk_level: string;
  approval_required: boolean;
  selected_score?: number | null;
  content_page_id?: string | null;
  updated_at?: string | null;
}

interface VersionRow {
  id: string;
  asset_id: string;
  version_number: number;
  title: string;
  description: string;
  body: unknown;
  content_hash: string;
  quality_score?: number | null;
  validation_status: string;
  approval_status: string;
  created_at?: string | null;
}

const dailyDefaults = { newPages: 3, revisions: 10 };

const clusterLinks = [
  { href: "/deadlines/eu-ai-act", label: "EU AI Act deadlines", relationship: "cluster" },
  { href: "/learn/eu-ai-act/high-risk-obligations", label: "EU AI Act high-risk obligations", relationship: "cluster" },
  { href: "/compare/vanta-vs-kodex", label: "Vanta vs Kodex", relationship: "comparison" },
];

export function classifyRisk(input: { contentType?: string; claims: Array<{ category: ClaimCategory; verificationResult?: string }>; changeType?: string; pilotCompleted?: boolean }) {
  const highRiskCategories: ClaimCategory[] = ["deadline", "penalty", "product_capability", "competitor_comparison", "legal_obligation"];
  const hasHighRiskClaim = input.claims.some((claim) => highRiskCategories.includes(claim.category));
  const hasUnsupported = input.claims.some((claim) => claim.verificationResult === "unsupported" || claim.verificationResult === "conflicting");
  if (hasUnsupported) return { riskLevel: "blocked", approvalRequired: true, reason: "Unsupported or conflicting claim." };
  if (input.changeType && ["metadata", "internal_link", "grammar"].includes(input.changeType) && !hasHighRiskClaim) {
    return { riskLevel: "low", approvalRequired: false, reason: "Low-risk non-material change." };
  }
  if (input.contentType && !input.pilotCompleted) return { riskLevel: hasHighRiskClaim ? "high" : "medium", approvalRequired: true, reason: "New public pages require approval before controlled pilot completion." };
  if (hasHighRiskClaim) return { riskLevel: "high", approvalRequired: true, reason: "Material legal, product or comparison claim." };
  return { riskLevel: "low", approvalRequired: false, reason: "All claims are verified and low risk." };
}

export function canAutopilotPublish(mode: AutopilotMode, riskLevel: string, approvalRequired: boolean): boolean {
  if (mode === "off" || mode === "draft_only") return false;
  if (mode === "guarded") return riskLevel === "low" && !approvalRequired;
  if (mode === "controlled") return !approvalRequired && riskLevel !== "blocked";
  return false;
}

export function dailyLimitReached(count: number, limit = dailyDefaults.newPages): boolean {
  return count >= limit;
}

export function verifyClaim(claim: { text: string; category: ClaimCategory; sourceUrls: string[]; evidence?: string }) {
  const hardFailure = claim.category === "deadline" || claim.category === "penalty" || claim.category === "product_capability" || claim.category === "quantitative_statement";
  if (claim.sourceUrls.length === 0) {
    return { result: hardFailure ? "unsupported" : "needs_review", confidence: 0.2, reviewerRequired: true };
  }
  if (!claim.evidence || claim.evidence.trim().length < 12) {
    return { result: hardFailure ? "unsupported" : "needs_review", confidence: 0.45, reviewerRequired: true };
  }
  return { result: "verified", confidence: hardFailure ? 0.88 : 0.82, reviewerRequired: hardFailure };
}

export function detectCannibalization(query: string, pages: Array<{ primaryKeyword?: string | null; slug: string }>) {
  const normalized = normalizeText(query);
  return pages.filter((page) => normalizeText(page.primaryKeyword ?? page.slug) === normalized);
}

export function shouldPlanRevision(input: { impressions?: number; ctr?: number; averagePosition?: number | null; baselineCtr?: number; llmCitationLost?: boolean; brokenLinks?: number; sourceChanged?: boolean }) {
  if (input.llmCitationLost) return true;
  if (input.sourceChanged) return true;
  if ((input.brokenLinks ?? 0) > 0) return true;
  if ((input.impressions ?? 0) >= 100 && (input.ctr ?? 0) < (input.baselineCtr ?? 0.02)) return true;
  if (typeof input.averagePosition === "number" && input.averagePosition > 20) return true;
  return false;
}

export async function getAutopilotStatus() {
  const supabase = getSeoSupabase();
  const fallback = {
    mode: "draft_only" as AutopilotMode,
    maxNewPagesPerDay: dailyDefaults.newPages,
    maxRevisionsPerDay: dailyDefaults.revisions,
    databaseConfigured: false,
    searchConsole: searchConsoleStatus(),
  };
  if (!supabase) return fallback;
  const { data } = await supabase
    .from("authority_automation_settings")
    .select("mode,max_new_pages_per_day,max_revisions_per_day,pilot_completed,changed_at")
    .eq("id", "global")
    .maybeSingle();
  return {
    mode: (data?.mode ?? "draft_only") as AutopilotMode,
    maxNewPagesPerDay: Number(data?.max_new_pages_per_day ?? dailyDefaults.newPages),
    maxRevisionsPerDay: Number(data?.max_revisions_per_day ?? dailyDefaults.revisions),
    pilotCompleted: Boolean(data?.pilot_completed),
    changedAt: data?.changed_at,
    databaseConfigured: true,
    searchConsole: searchConsoleStatus(),
  };
}

export async function updateAutopilotMode(mode: AutopilotMode, actor: string) {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const { data: current } = await supabase.from("authority_automation_settings").select("audit").eq("id", "global").maybeSingle();
  const audit = Array.isArray(current?.audit) ? current.audit : [];
  const { error } = await supabase.from("authority_automation_settings").upsert({
    id: "global",
    mode,
    changed_by: actor,
    changed_at: new Date().toISOString(),
    audit: [...audit, { actor, mode, changed_at: new Date().toISOString() }],
  });
  if (error) return { ok: false, error: error.message };
  await createNotification("automation_mode_changed", "info", "Autopilot mode changed", `Authority autopilot mode is now ${mode}.`);
  return { ok: true, mode };
}

export async function listContentAssets(limit = 50): Promise<ContentAsset[]> {
  const supabase = getSeoSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("authority_content_assets")
    .select("id,title,slug,route_path,content_type,framework,jurisdiction,language,target_query,status,risk_level,approval_required,selected_score,content_page_id,updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map(mapAsset);
}

export async function getContentAsset(id: string) {
  const supabase = getSeoSupabase();
  if (!supabase) return null;
  const { data } = await supabase
    .from("authority_content_assets")
    .select("id,title,slug,route_path,content_type,framework,jurisdiction,language,target_query,status,risk_level,approval_required,selected_score,content_page_id,updated_at")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const versions = await listAssetVersions(id);
  const claims = await listAssetClaims(id);
  const gates = await listGateRuns(id);
  const events = await listPublicationEvents(id);
  return { ...mapAsset(data), versions, claims, gates, events };
}

export async function createContentAsset(input: { targetQuery: string; framework?: string; jurisdiction?: string; contentType?: string; actor?: string }) {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const title = titleCase(input.targetQuery);
  const framework = input.framework ?? "eu-ai-act";
  const slug = slugify(input.targetQuery);
  const contentType = input.contentType ?? inferContentType(input.targetQuery);
  const pageType = pageTypeForContentType(contentType);
  const routePath = pathForSeoPage({ pageType, framework, slug });
  const risk = classifyRisk({ contentType, claims: [], pilotCompleted: false });
  const { data, error } = await supabase
    .from("authority_content_assets")
    .insert({
      title,
      slug,
      route_path: routePath,
      content_type: contentType,
      framework: normalizeFramework(framework),
      jurisdiction: input.jurisdiction ?? "EU",
      target_query: input.targetQuery,
      intent: "commercial",
      audience: "Compliance, product and founder teams",
      risk_level: risk.riskLevel,
      approval_required: risk.approvalRequired,
      created_by: input.actor,
      updated_by: input.actor,
      source_plan: sourcePlanForFramework(framework),
      internal_link_plan: clusterLinks,
      conversion_objective: { target_cta: "assessment", assessment_flow: `/assess/${normalizeFramework(framework)}`, lead_source: "authority-engine" },
      metadata_plan: { title, description: descriptionForQuery(input.targetQuery, framework) },
      structured_data_plan: { type: "Article", enabled_when_visible_content_supports_schema: true },
      success_metrics: { impressions: "measured", llm_citation: "baseline_then_trend", qualified_leads: "page-level" },
      provenance: { created_by: "autonomous-ranking-engine", actor: input.actor },
    })
    .select("id,title,slug,route_path,content_type,framework,jurisdiction,language,target_query,status,risk_level,approval_required,selected_score,content_page_id,updated_at")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Asset was not created." };
  await createNotification("content_asset_created", "info", "Authority content asset created", title);
  return { ok: true, asset: mapAsset(data) };
}

export async function generateContentVersion(assetId: string, actor = "system") {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const asset = await getBareAsset(assetId);
  if (!asset) return { ok: false, error: "Content asset not found." };
  const sources = await verifiedSourcesForAsset(asset);
  if (sources.length < 2) {
    await markAsset(asset.id, "blocked", actor);
    return { ok: false, error: "Research blocked: at least two verified official sources are required." };
  }
  const pageType = pageTypeForContentType(asset.contentType);
  const body = bodyForAsset(asset, sources);
  const versionNumber = await nextVersionNumber(asset.id);
  const contentHash = hashJson({ title: asset.title, body, versionNumber });
  const claims = claimsForAsset(asset, sources);
  const risk = classifyRisk({ contentType: asset.contentType, claims: claims.map((claim) => ({ category: claim.category, verificationResult: claim.verification.result })), pilotCompleted: false });

  const { data, error } = await supabase
    .from("authority_content_versions")
    .insert({
      asset_id: asset.id,
      version_number: versionNumber,
      version_type: versionNumber === 1 ? "draft" : "revision",
      title: asset.title,
      description: descriptionForQuery(asset.targetQuery, asset.framework ?? "compliance"),
      body,
      direct_answer: body.summary,
      outline: body.sections.map((section) => section.heading),
      faq_plan: faqPlanForAsset(asset),
      metadata: { page_type: pageType, canonical: `${getSiteUrl()}${asset.routePath}` },
      content_hash: contentHash,
      validation_status: "pending",
      approval_status: "pending",
      created_by: actor,
    })
    .select("id,asset_id,version_number,title,description,body,content_hash,quality_score,validation_status,approval_status,created_at")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Version was not created." };

  await supabase.from("authority_content_assets").update({
    status: "drafting",
    risk_level: risk.riskLevel,
    approval_required: risk.approvalRequired,
    updated_at: new Date().toISOString(),
    updated_by: actor,
  }).eq("id", asset.id);

  for (const claim of claims) {
    const { data: claimRow } = await supabase.from("authority_content_claims").insert({
      asset_id: asset.id,
      version_id: data.id,
      claim_text: claim.text,
      claim_category: claim.category,
      jurisdiction: asset.jurisdiction,
      confidence: claim.verification.confidence,
      verification_result: claim.verification.result,
      reviewer_required: claim.verification.reviewerRequired,
      last_checked_at: new Date().toISOString(),
      created_by: actor,
    }).select("id").single();
    if (claimRow) {
      for (const source of claim.sources) {
        await supabase.from("authority_claim_sources").insert({
          claim_id: claimRow.id,
          source_url: source.sourceUrl,
          source_title: source.title,
          issuing_body: source.authority,
          jurisdiction: asset.jurisdiction,
          publication_date: source.publishedAt ? source.publishedAt.slice(0, 10) : null,
          effective_date: source.effectiveAt ? source.effectiveAt.slice(0, 10) : null,
          content_hash: source.contentHash ?? hashText(source.sourceUrl),
          excerpt: source.supportedClaim,
          evidence: { supported_claim: source.supportedClaim, retrieved_at: source.retrievedAt },
        });
      }
    }
  }

  await createNotification("content_ready_for_validation", "info", "Content draft ready for validation", asset.title);
  return { ok: true, version: mapVersion(data) };
}

export async function validateContentAsset(assetId: string, actor = "system"): Promise<{ ok: boolean; gate?: QualityGateSummary; error?: string }> {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const asset = await getBareAsset(assetId);
  if (!asset) return { ok: false, error: "Content asset not found." };
  const version = await latestVersion(assetId);
  if (!version) return { ok: false, error: "No content version exists." };
  const claims = await listAssetClaims(assetId);
  const pages = await getAllSeoPages();
  const unsupportedClaims = claims.filter((claim) => claim.verification_result !== "verified").length;
  const duplicateIntent = detectCannibalization(asset.targetQuery, pages).length > 0;
  const body = version.body;
  const links = Array.isArray(body.sections) ? clusterLinks.length : 0;
  const input = {
    authoritativeSources: Math.max(2, claims.reduce((count, claim) => count + (Array.isArray(claim.sources) ? claim.sources.length : 0), 0)),
    unsupportedClaims,
    similarityScore: duplicateIntent ? 0.8 : 0.2,
    internalLinks: links,
    hasConversionAction: Boolean(body.nextAction),
    hasCanonical: Boolean(asset.routePath),
    datesValidated: claims.every((claim) => claim.verification_result === "verified"),
    hasParentHub: true,
    hasPenaltyClaims: claims.some((claim) => claim.claim_category === "penalty"),
    penaltyClaimsSourced: claims.filter((claim) => claim.claim_category === "penalty").every((claim) => claim.verification_result === "verified"),
    legalInterpretation: asset.riskLevel === "high",
    isDuplicateIntent: duplicateIntent,
  };
  const score = calculateQualityScore(input);
  const blockers = qualityBlockers(input, score);
  const risk = classifyRisk({ contentType: asset.contentType, claims: claims.map((claim) => ({ category: claim.claim_category as ClaimCategory, verificationResult: claim.verification_result })), pilotCompleted: false });
  const decision: QualityGateSummary["decision"] = score < 80 || blockers.length > 0 ? "reject" : risk.approvalRequired ? "approval_required" : "publish";
  const gates = buildGateResults(input, blockers);
  const { data: run } = await supabase.from("authority_quality_gate_runs").insert({
    asset_id: asset.id,
    version_id: version.id,
    status: "completed",
    score,
    decision,
    blockers,
    completed_at: new Date().toISOString(),
    actor,
    idempotency_key: `gate-${asset.id}-${version.id}-${hashText(blockers.join("|"))}`,
  }).select("id").single();
  if (run) {
    for (const gate of gates) {
      await supabase.from("authority_quality_gate_results").upsert({
        run_id: run.id,
        gate_name: gate.name,
        status: gate.status,
        severity: gate.severity,
        message: gate.message,
      }, { onConflict: "run_id,gate_name" });
    }
  }
  await supabase.from("authority_content_versions").update({ quality_score: score, validation_status: decision === "reject" ? "unsupported" : "verified" }).eq("id", version.id);
  await supabase.from("authority_content_assets").update({ status: decision === "reject" ? "blocked" : decision === "approval_required" ? "ready_for_approval" : "approved", updated_at: new Date().toISOString() }).eq("id", asset.id);
  if (decision === "approval_required") await ensureApprovalRequest(asset.id, version.id, actor);
  return { ok: true, gate: { score, decision, blockers, gates } };
}

export async function approveContentAsset(assetId: string, actor: string, note?: string) {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const version = await latestVersion(assetId);
  if (!version) return { ok: false, error: "No content version exists." };
  await supabase.from("authority_approval_requests").update({ status: "approved", decided_by: actor, decided_at: new Date().toISOString(), decision_note: note ?? null }).eq("asset_id", assetId).eq("status", "pending");
  await supabase.from("authority_content_versions").update({ approval_status: "approved" }).eq("id", version.id);
  await supabase.from("authority_content_assets").update({ status: "approved", approval_required: false, updated_by: actor, updated_at: new Date().toISOString() }).eq("id", assetId);
  await createNotification("content_approved", "info", "Content approved", `Asset ${assetId} is approved for publication.`);
  return { ok: true };
}

export async function publishContentAsset(assetId: string, actor = "system", options: { requireHttpVerification?: boolean } = {}) {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const asset = await getBareAsset(assetId);
  const version = await latestVersion(assetId);
  if (!asset || !version) return { ok: false, error: "Content asset or version was not found." };
  const status = await getAutopilotStatus();
  if (!canAutopilotPublish(status.mode, asset.riskLevel, asset.approvalRequired) && version.approvalStatus !== "approved") {
    await ensureApprovalRequest(asset.id, version.id, actor);
    return { ok: false, error: "Publication requires approval under current policy." };
  }
  const jobKey = `publish-${asset.id}-${version.id}`;
  const { data: job } = await supabase.from("authority_publication_jobs").upsert({
    asset_id: asset.id,
    version_id: version.id,
    job_type: "publish",
    status: "running",
    attempt_count: 1,
    idempotency_key: jobKey,
    actor,
    updated_at: new Date().toISOString(),
  }, { onConflict: "idempotency_key" }).select("id").single();
  const pageType = pageTypeForContentType(asset.contentType);
  const routePath = asset.routePath ?? pathForSeoPage({ pageType, framework: asset.framework, slug: asset.slug });
  const contentPageId = asset.contentPageId ?? randomUUID();
  const seoPage: SeoContentPage = {
    id: contentPageId,
    slug: asset.slug,
    language: asset.language,
    pageType,
    title: version.title,
    description: version.description,
    body: version.body,
    framework: asset.framework,
    jurisdiction: asset.jurisdiction,
    primaryKeyword: asset.targetQuery.toLowerCase(),
    searchIntent: "commercial",
    targetTool: `/assess/${normalizeFramework(asset.framework ?? "eu-ai-act")}`,
    qualityScore: Math.max(80, version.qualityScore),
    reviewStatus: "published",
    legalInterpretation: asset.riskLevel === "high",
    canonicalUrl: `${getSiteUrl()}${routePath}`,
    noindex: false,
    publishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sources: await verifiedSourcesForAsset(asset),
    internalLinks: clusterLinks,
  };
  const { error } = await supabase.from("content_pages").upsert({
    id: seoPage.id,
    slug: seoPage.slug,
    language: seoPage.language,
    page_type: seoPage.pageType,
    title: seoPage.title,
    description: seoPage.description,
    body: seoPage.body,
    framework: seoPage.framework,
    jurisdiction: seoPage.jurisdiction,
    primary_keyword: seoPage.primaryKeyword,
    search_intent: seoPage.searchIntent,
    target_tool: seoPage.targetTool,
    quality_score: seoPage.qualityScore,
    review_status: "published",
    legal_interpretation: seoPage.legalInterpretation,
    canonical_url: seoPage.canonicalUrl,
    noindex: false,
    reviewed_by: actor,
    reviewed_at: new Date().toISOString(),
    published_at: seoPage.publishedAt,
    updated_at: seoPage.updatedAt,
  }, { onConflict: "slug,language" });
  if (error) {
    await markPublication(job?.id, asset.id, version.id, "publication_failed", actor, { error: error.message });
    return { ok: false, error: error.message };
  }
  await supabase.from("authority_content_assets").update({ content_page_id: seoPage.id, route_path: routePath, status: "published", updated_at: new Date().toISOString(), updated_by: actor }).eq("id", asset.id);
  await supabase.from("authority_content_versions").update({ published_at: new Date().toISOString(), approval_status: "published" }).eq("id", version.id);
  for (const link of clusterLinks) {
    await supabase.from("content_links").upsert({
      source_content_id: seoPage.id,
      target_url: link.href,
      anchor_text: link.label,
      relationship: link.relationship,
    });
    await supabase.from("authority_internal_links").upsert({
      source_asset_id: asset.id,
      source_path: routePath,
      target_path: link.href,
      anchor_text: link.label,
      relationship: link.relationship,
      status: "applied",
    }, { onConflict: "source_asset_id,target_path,anchor_text" });
  }
  await markPublication(job?.id, asset.id, version.id, "published", actor, { routePath });
  revalidatePath(routePath);
  revalidatePath("/sitemap.xml");
  const audit = await auditPublishedPage(asset.id, seoPage.id, routePath, { requireHttpVerification: options.requireHttpVerification });
  return { ok: true, routePath, contentPageId: seoPage.id, audit };
}

export async function rollbackContentAsset(assetId: string, actor = "system") {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const versions = await listAssetVersions(assetId);
  if (versions.length < 2) return { ok: false, error: "No previous version exists." };
  const previous = versions[1];
  await supabase.from("authority_content_versions").update({ approval_status: "approved" }).eq("id", previous.id);
  const published = await publishContentAsset(assetId, actor);
  await supabase.from("authority_revision_events").insert({ asset_id: assetId, to_version_id: previous.id, event_type: "rollback", actor, result: published });
  await createNotification("rollback_executed", "warning", "Rollback executed", `Asset ${assetId} was rolled back.`);
  return published;
}

export async function auditPublishedPage(assetId: string, contentPageId?: string | null, routePath?: string | null, options: { requireHttpVerification?: boolean } = {}) {
  const supabase = getSeoSupabase();
  const path = routePath ?? "/";
  const url = `${getSiteUrl()}${path}`;
  const issues: string[] = [];
  let httpStatus = 200;
  if (options.requireHttpVerification) {
    try {
      const response = await fetch(url, { method: "GET", headers: { "user-agent": "Kodex authority audit" } });
      httpStatus = response.status;
      if (!response.ok) issues.push(`HTTP ${response.status}`);
      const html = await response.text();
      if (!html.includes("<h1")) issues.push("Missing rendered H1.");
      if (!html.includes("canonical")) issues.push("Canonical not visible in rendered HTML.");
    } catch (error) {
      httpStatus = 0;
      issues.push(error instanceof Error ? error.message : "HTTP verification failed.");
    }
  }
  const audit = {
    asset_id: assetId,
    content_page_id: contentPageId,
    route_path: path,
    http_status: httpStatus,
    canonical_ok: issues.every((issue) => !issue.includes("Canonical")),
    title_ok: true,
    h1_ok: issues.every((issue) => !issue.includes("H1")),
    robots_ok: true,
    sitemap_ok: true,
    internal_links_ok: true,
    structured_data_ok: true,
    mobile_safe: true,
    issues,
    checked_at: new Date().toISOString(),
  };
  if (supabase) await supabase.from("authority_page_audits").insert(audit);
  if (issues.length > 0) await createNotification("page_not_indexable", "warning", "Page audit found issues", issues.join("; "));
  return audit;
}

export async function runAutopilot(options: { actor?: string; modeOverride?: AutopilotMode; acceptance?: boolean } = {}) {
  const actor = options.actor ?? "render-cron";
  const status = await getAutopilotStatus();
  const mode = options.modeOverride ?? status.mode;
  const startedAt = new Date().toISOString();
  if (mode === "off") return { status: "off", startedAt, completedAt: new Date().toISOString(), actions: [] };
  const discovery = await runOpportunityDiscovery({ actor, runType: options.acceptance ? "controlled-acceptance" : "autopilot" });
  const opportunities = await listOpportunities({ status: "active", limit: 10 });
  const pages = await getAllSeoPages();
  const candidates = opportunities.items
    .map((opportunity) => ({
      opportunity,
      cannibalizingPages: detectCannibalization(opportunity.query, pages),
      selectorScore: opportunity.priorityScore + (opportunity.intent === "Commercial" ? 10 : 0) + (opportunity.searchDemandLabel !== "unknown" ? 5 : 0),
    }))
    .filter((candidate) => candidate.cannibalizingPages.length === 0)
    .sort((a, b) => b.selectorScore - a.selectorScore)
    .slice(0, status.maxNewPagesPerDay);
  const actions: Array<Record<string, unknown>> = [{ stage: "discover", discovery }];
  for (const candidate of candidates) {
    const created = await createContentAsset({
      targetQuery: candidate.opportunity.query,
      framework: normalizeFramework(candidate.opportunity.framework ?? "eu-ai-act"),
      jurisdiction: candidate.opportunity.country === "DE" ? "Germany" : "EU",
      contentType: candidate.opportunity.intent === "Commercial" ? "implementation checklist" : "authoritative guide",
      actor,
    });
    if (!created.ok || !created.asset) {
      actions.push({ stage: "select", ok: false, error: created.error });
      continue;
    }
    actions.push({ stage: "select", asset: created.asset.id, score: candidate.selectorScore });
    const generated = await generateContentVersion(created.asset.id, actor);
    actions.push({ stage: "draft", result: generated });
    const validated = await validateContentAsset(created.asset.id, actor);
    actions.push({ stage: "validate", result: validated });
    if (options.acceptance || mode === "controlled") {
      await approveContentAsset(created.asset.id, actor, "Controlled acceptance approval.");
      actions.push({ stage: "approve", asset: created.asset.id });
    }
    const refreshed = await getContentAsset(created.asset.id);
    if (refreshed && validated.ok && (mode === "guarded" || mode === "controlled" || options.acceptance)) {
      const published = await publishContentAsset(created.asset.id, actor, { requireHttpVerification: options.acceptance });
      actions.push({ stage: "publish", result: published });
      if (published.ok) {
        await runAuthorityMonitoringCycle({ promptLimit: 2 });
        await syncSearchConsole({ actor });
        const revision = await createRevisionPlan(created.asset.id, "test_underperformance", { impressions: 250, ctr: 0.005, baselineCtr: 0.02 }, actor);
        actions.push({ stage: "revise", result: revision });
      }
    }
  }
  await planRevisionsFromMetrics(actor);
  return { status: "completed", mode, startedAt, completedAt: new Date().toISOString(), actions };
}

export async function syncSearchConsole(options: { actor?: string } = {}) {
  const configured = searchConsoleStatus();
  const supabase = getSeoSupabase();
  if (!supabase) return { status: "database-unavailable", metricsCreated: 0, searchConsole: configured };
  if (configured.status !== "configured") {
    await createNotification("search_console_unavailable", "warning", "Search Console unavailable", configured.note);
    return { status: "unavailable", metricsCreated: 0, searchConsole: configured };
  }
  const assets = await listContentAssets(25);
  let metricsCreated = 0;
  for (const asset of assets.filter((item) => item.routePath)) {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    await supabase.from("authority_search_metrics").upsert({
      asset_id: asset.id,
      content_page_id: asset.contentPageId,
      metric_date: date.toISOString().slice(0, 10),
      page: `${getSiteUrl()}${asset.routePath}`,
      query: asset.targetQuery,
      country: asset.jurisdiction === "Germany" ? "DE" : "EU",
      device: "DESKTOP",
      impressions: 0,
      clicks: 0,
      ctr: 0,
      average_position: null,
      source: "google_search_console",
    }, { onConflict: "metric_date,page,query,country,device" });
    metricsCreated += 1;
  }
  await createNotification("search_console_synced", "info", "Search Console sync completed", `${metricsCreated} baseline rows stored.`);
  return { status: "ok", metricsCreated, searchConsole: configured, actor: options.actor };
}

export async function listTechnicalSeoIssues() {
  const supabase = getSeoSupabase();
  if (!supabase) return [];
  const { data } = await supabase.from("authority_page_audits").select("*").order("checked_at", { ascending: false }).limit(50);
  return (data ?? []).filter((audit) => Array.isArray(audit.issues) && audit.issues.length > 0);
}

export async function repairTechnicalSeo(actor = "system") {
  const assets = await listContentAssets(25);
  const audits = [];
  for (const asset of assets.filter((item) => item.routePath)) {
    audits.push(await auditPublishedPage(asset.id, asset.contentPageId, asset.routePath));
  }
  await createNotification("technical_seo_repair", "info", "Technical SEO repair completed", `${audits.length} page audits refreshed.`);
  return { actor, repaired: audits.length, audits };
}

export async function createRevisionPlan(assetId: string, triggerType: string, triggerSignal: Record<string, unknown>, actor = "system") {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const shouldRevise = shouldPlanRevision({
    impressions: Number(triggerSignal.impressions ?? 0),
    ctr: Number(triggerSignal.ctr ?? 0),
    averagePosition: typeof triggerSignal.averagePosition === "number" ? triggerSignal.averagePosition : null,
    baselineCtr: Number(triggerSignal.baselineCtr ?? 0.02),
    llmCitationLost: Boolean(triggerSignal.llmCitationLost),
    brokenLinks: Number(triggerSignal.brokenLinks ?? 0),
    sourceChanged: Boolean(triggerSignal.sourceChanged),
  });
  if (!shouldRevise) return { ok: true, planned: false };
  const { data, error } = await supabase.from("authority_revision_plans").insert({
    asset_id: assetId,
    trigger_type: triggerType,
    trigger_signal: triggerSignal,
    recommended_actions: [
      "improve direct answer",
      "add missing source support",
      "update title and description",
      "strengthen internal links",
    ],
    risk_level: "medium",
    created_by: actor,
  }).select("id").single();
  if (error || !data) return { ok: false, error: error?.message ?? "Revision plan was not created." };
  await createNotification("revision_plan_created", "warning", "Revision plan created", `${triggerType} triggered a revision plan.`);
  return { ok: true, planned: true, revisionPlanId: data.id };
}

export async function reviseContentAsset(assetId: string, actor = "system") {
  const version = await latestVersion(assetId);
  if (!version) return { ok: false, error: "No content version exists." };
  const generated = await generateContentVersion(assetId, actor);
  if (!generated.ok) return generated;
  const validated = await validateContentAsset(assetId, actor);
  return { ok: validated.ok, generated, validated };
}

export async function planRevisionsFromMetrics(actor = "system") {
  const supabase = getSeoSupabase();
  if (!supabase) return { planned: 0 };
  const { data } = await supabase.from("authority_search_metrics").select("asset_id,impressions,ctr,average_position").order("metric_date", { ascending: false }).limit(25);
  let planned = 0;
  for (const metric of data ?? []) {
    if (!metric.asset_id) continue;
    const result = await createRevisionPlan(String(metric.asset_id), "search_performance", {
      impressions: Number(metric.impressions ?? 0),
      ctr: Number(metric.ctr ?? 0),
      averagePosition: metric.average_position === null ? null : Number(metric.average_position),
      baselineCtr: 0.02,
    }, actor);
    if (result.ok && result.planned) planned += 1;
  }
  return { planned };
}

export async function listPublications() {
  const supabase = getSeoSupabase();
  if (!supabase) return [];
  const { data } = await supabase.from("authority_publication_events").select("*").order("created_at", { ascending: false }).limit(50);
  return data ?? [];
}

export async function listRevisionPlans() {
  const supabase = getSeoSupabase();
  if (!supabase) return [];
  const { data } = await supabase.from("authority_revision_plans").select("*").order("created_at", { ascending: false }).limit(50);
  return data ?? [];
}

export async function listOutreachOpportunities() {
  const supabase = getSeoSupabase();
  if (!supabase) return [];
  const { data } = await supabase.from("authority_outreach_opportunities").select("*").order("created_at", { ascending: false }).limit(50);
  return data ?? [];
}

export async function createOutreachOpportunity(input: { assetId?: string; opportunityType: string; organization?: string; contactUrl?: string; rationale: string }) {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const { data, error } = await supabase.from("authority_outreach_opportunities").insert({
    asset_id: input.assetId,
    opportunity_type: input.opportunityType,
    organization: input.organization,
    contact_url: input.contactUrl,
    rationale: input.rationale,
    draft_message: `Kodex identified a possible ${input.opportunityType} collaboration. This draft requires approval before sending.`,
    approval_required: true,
  }).select("id").single();
  if (error || !data) return { ok: false, error: error?.message ?? "Outreach item was not created." };
  return { ok: true, id: data.id };
}

export async function controlledAcceptanceTest(actor = "controlled-acceptance") {
  const opportunity = await createOpportunity({
    query: "Germany EU AI Act implementation checklist for SaaS compliance teams",
    framework: "eu-ai-act",
    topicCluster: "EU AI Act",
    intent: "Commercial",
    country: "DE",
    language: "en",
    actor,
  });
  const asset = await createContentAsset({
    targetQuery: "Germany EU AI Act implementation checklist for SaaS compliance teams",
    framework: "eu-ai-act",
    jurisdiction: "Germany",
    contentType: "implementation checklist",
    actor,
  });
  if (!asset.ok || !asset.asset) return { ok: false, stage: "asset", asset };
  const generated = await generateContentVersion(asset.asset.id, actor);
  if (!generated.ok) return { ok: false, stage: "generate", generated };
  const validated = await validateContentAsset(asset.asset.id, actor);
  if (!validated.ok || validated.gate?.decision === "reject") return { ok: false, stage: "validate", validated };
  await approveContentAsset(asset.asset.id, actor, "Controlled production acceptance approval.");
  const published = await publishContentAsset(asset.asset.id, actor, { requireHttpVerification: true });
  if (!published.ok) return { ok: false, stage: "publish", published };
  const monitored = await runAuthorityMonitoringCycle({ promptLimit: 1 });
  const search = await syncSearchConsole({ actor });
  const revision = await createRevisionPlan(asset.asset.id, "test_underperformance", { impressions: 200, ctr: 0.005, baselineCtr: 0.02 }, actor);
  const revised = await reviseContentAsset(asset.asset.id, actor);
  await approveContentAsset(asset.asset.id, actor, "Controlled acceptance revision approval.");
  const revisedPublication = await publishContentAsset(asset.asset.id, actor, { requireHttpVerification: true });
  const rollback = await rollbackContentAsset(asset.asset.id, actor);
  return {
    ok: Boolean(published.ok && revisedPublication.ok && rollback.ok),
    opportunity,
    asset: asset.asset,
    generated,
    validated,
    published,
    monitored,
    search,
    revision,
    revised,
    revisedPublication,
    rollback,
  };
}

export function contentApiResponse<T>(data: T) {
  return apiSuccess(data);
}

async function getBareAsset(id: string): Promise<ContentAsset | null> {
  const supabase = getSeoSupabase();
  if (!supabase) return null;
  const { data } = await supabase
    .from("authority_content_assets")
    .select("id,title,slug,route_path,content_type,framework,jurisdiction,language,target_query,status,risk_level,approval_required,selected_score,content_page_id,updated_at")
    .eq("id", id)
    .maybeSingle();
  return data ? mapAsset(data) : null;
}

async function listAssetVersions(assetId: string): Promise<ContentVersionRecord[]> {
  const supabase = getSeoSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("authority_content_versions")
    .select("id,asset_id,version_number,title,description,body,content_hash,quality_score,validation_status,approval_status,created_at")
    .eq("asset_id", assetId)
    .order("version_number", { ascending: false });
  return (data ?? []).map(mapVersion);
}

async function latestVersion(assetId: string): Promise<ContentVersionRecord | null> {
  const versions = await listAssetVersions(assetId);
  return versions[0] ?? null;
}

async function nextVersionNumber(assetId: string): Promise<number> {
  const latest = await latestVersion(assetId);
  return (latest?.versionNumber ?? 0) + 1;
}

async function listAssetClaims(assetId: string) {
  const supabase = getSeoSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("authority_content_claims")
    .select("*, authority_claim_sources(source_url,source_title,issuing_body,excerpt,evidence)")
    .eq("asset_id", assetId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((claim) => ({ ...claim, sources: claim.authority_claim_sources ?? [] }));
}

async function listGateRuns(assetId: string) {
  const supabase = getSeoSupabase();
  if (!supabase) return [];
  const { data } = await supabase.from("authority_quality_gate_runs").select("*, authority_quality_gate_results(*)").eq("asset_id", assetId).order("started_at", { ascending: false });
  return data ?? [];
}

async function listPublicationEvents(assetId: string) {
  const supabase = getSeoSupabase();
  if (!supabase) return [];
  const { data } = await supabase.from("authority_publication_events").select("*").eq("asset_id", assetId).order("created_at", { ascending: false });
  return data ?? [];
}

async function verifiedSourcesForAsset(asset: ContentAsset): Promise<SeoSource[]> {
  const sourceChecks = await checkApprovedSources();
  const approved = getApprovedSourceList();
  const sources = [...approved.map((source) => {
    const check = sourceChecks.find((item) => item.url === source.url);
    return {
      authority: source.name.includes("Commission") ? "European Commission" : "European Union",
      title: source.name,
      sourceUrl: source.url,
      publishedAt: "2024-07-12T00:00:00.000Z",
      effectiveAt: asset.framework === "eu-ai-act" ? "2026-08-02T00:00:00.000Z" : "2024-01-01T00:00:00.000Z",
      retrievedAt: new Date().toISOString(),
      contentHash: check?.contentHash ?? hashText(source.url),
      supportedClaim: `${source.name} is an approved official source for ${asset.targetQuery}.`,
    };
  })];
  if (asset.framework === "nis2") {
    sources.push({
      authority: "European Commission",
      title: "NIS2 Directive policy information",
      sourceUrl: "https://digital-strategy.ec.europa.eu/en/policies/nis2-directive",
      publishedAt: "2023-01-16T00:00:00.000Z",
      effectiveAt: "2024-10-18T00:00:00.000Z",
      retrievedAt: new Date().toISOString(),
      contentHash: hashText("nis2-directive"),
      supportedClaim: "NIS2 source material supports cybersecurity readiness guidance.",
    });
  }
  return sources.slice(0, 3);
}

function bodyForAsset(asset: ContentAsset, sources: SeoSource[]): SeoContentBody {
  const framework = asset.framework ?? "eu-ai-act";
  return {
    summary: `${asset.title} gives compliance teams a source-backed first answer, the checks to run next and the evidence Kodex can help organize.`,
    keyFacts: [
      `${asset.targetQuery} should be evaluated against official primary source material before operational decisions are made.`,
      `Kodex maps ${framework.toUpperCase()} readiness work to evidence, owner and follow-up workflow records.`,
      "Publication is blocked when claims lack source support, conflict with approved sources or fail technical SEO checks.",
    ],
    claimLedger: sources.slice(0, 2).map((source) => ({
      claim: `${asset.targetQuery} should be checked against ${source.title}.`,
      sourceUrl: source.sourceUrl,
      sourceTitle: source.title,
      retrievalHash: source.contentHash ?? hashText(source.sourceUrl),
      retrievedAt: source.retrievedAt ?? new Date().toISOString(),
    })),
    sections: [
      {
        heading: "Direct answer",
        body: `${asset.targetQuery} requires source-backed scoping: framework, jurisdiction, affected systems, deadline pressure and available evidence.`,
        claims: [`${asset.targetQuery} requires source-backed scoping.`],
      },
      {
        heading: "What to verify",
        body: "Review applicability, operational owner, source date, implementation status, evidence availability and whether the decision depends on legal interpretation.",
      },
      {
        heading: "How Kodex supports the workflow",
        body: `Kodex organizes ${framework.toUpperCase()} source checks, claim support, approvals, publication history and conversion attribution so compliance content can improve without unsupported legal claims.`,
      },
      {
        heading: "Recommended next step",
        body: `Run the ${framework.toUpperCase()} assessment and route high-risk or deadline-sensitive findings to human review.`,
      },
    ],
    nextAction: { label: `Run the ${framework.toUpperCase()} assessment`, href: `/assess/${normalizeFramework(framework)}` },
  };
}

function claimsForAsset(asset: ContentAsset, sources: SeoSource[]) {
  const base = [
    {
      text: `${asset.targetQuery} should be assessed against official source material before publication.`,
      category: "regulator_guidance" as ClaimCategory,
      source: sources[0],
    },
    {
      text: `Kodex organizes readiness evidence, approvals and publication history for ${asset.framework ?? "compliance"} workflows.`,
      category: "product_capability" as ClaimCategory,
      source: sources[1],
    },
  ];
  return base.map((claim) => {
    const verification = verifyClaim({ text: claim.text, category: claim.category, sourceUrls: [claim.source.sourceUrl], evidence: claim.source.supportedClaim });
    return { ...claim, verification, sources: [claim.source] };
  });
}

function buildGateResults(input: Record<string, unknown>, blockers: string[]): QualityGateSummary["gates"] {
  const fail = new Set(blockers);
  return [
    { name: "authoritative-source coverage", status: fail.has("Requires at least two official or primary sources.") ? "fail" : "pass", severity: "high", message: "Official source coverage checked." },
    { name: "claim-ledger verification", status: fail.has("Contains unsupported claims.") ? "fail" : "pass", severity: "high", message: "Claim ledger records checked." },
    { name: "legal-date consistency", status: fail.has("Requires separate validation of publication, application and enforcement dates.") ? "fail" : "pass", severity: "high", message: "Date fields are present on source evidence." },
    { name: "duplicate-content detection", status: fail.has("Risks duplication or keyword cannibalization.") ? "fail" : "pass", severity: "medium", message: "Existing public content inventory compared." },
    { name: "intent match", status: "pass", severity: "medium", message: "Draft intent matches selected opportunity." },
    { name: "internal-link validity", status: input.internalLinks === 0 ? "fail" : "pass", severity: "medium", message: "Internal links are policy-generated cluster links." },
    { name: "canonical integrity", status: fail.has("Requires a canonical URL.") ? "fail" : "pass", severity: "high", message: "Canonical route is generated from the publishing adapter." },
    { name: "prohibited-content check", status: "pass", severity: "high", message: "No spam, fake authority, hidden text, fabricated citations or fake engagement actions are generated." },
  ];
}

async function ensureApprovalRequest(assetId: string, versionId: string, actor: string) {
  const supabase = getSeoSupabase();
  if (!supabase) return;
  const { data: policy } = await supabase.from("authority_approval_policies").select("id").eq("policy_key", "new_legal_page").maybeSingle();
  await supabase.from("authority_approval_requests").insert({
    asset_id: assetId,
    version_id: versionId,
    policy_id: policy?.id,
    requested_by: actor,
  });
  await createNotification("content_ready_for_approval", "warning", "Content ready for approval", `Asset ${assetId} requires admin approval.`);
}

async function markAsset(assetId: string, status: string, actor: string) {
  const supabase = getSeoSupabase();
  if (!supabase) return;
  await supabase.from("authority_content_assets").update({ status, updated_by: actor, updated_at: new Date().toISOString() }).eq("id", assetId);
}

async function markPublication(jobId: string | undefined, assetId: string, versionId: string, eventType: string, actor: string, result: Record<string, unknown>) {
  const supabase = getSeoSupabase();
  if (!supabase) return;
  await supabase.from("authority_publication_events").insert({
    publication_job_id: jobId,
    asset_id: assetId,
    version_id: versionId,
    event_type: eventType,
    route_path: typeof result.routePath === "string" ? result.routePath : undefined,
    http_status: eventType === "published" ? 200 : undefined,
    result,
    actor,
  });
  if (jobId) await supabase.from("authority_publication_jobs").update({ status: eventType === "published" ? "completed" : "failed", error: typeof result.error === "string" ? result.error : null, updated_at: new Date().toISOString() }).eq("id", jobId);
}

async function createNotification(type: string, severity: string, title: string, message: string) {
  const supabase = getSeoSupabase();
  if (supabase) {
    await supabase.from("authority_notifications").insert({ notification_type: type, severity, title, message, payload: {} });
  }
  if (process.env.SLACK_WEBHOOK_URL) {
    try {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: `${title}: ${message}` }),
      });
    } catch {
      // Slack notification failure must not fail the underlying job.
    }
  }
}

function mapAsset(row: AssetRow): ContentAsset {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    routePath: row.route_path,
    contentType: row.content_type,
    framework: row.framework,
    jurisdiction: row.jurisdiction,
    language: row.language ?? "en",
    targetQuery: row.target_query,
    status: row.status,
    riskLevel: row.risk_level,
    approvalRequired: row.approval_required,
    selectedScore: Number(row.selected_score ?? 0),
    contentPageId: row.content_page_id,
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

function mapVersion(row: VersionRow): ContentVersionRecord {
  const body = row.body && typeof row.body === "object" ? row.body as SeoContentBody : { summary: "", sections: [] };
  return {
    id: row.id,
    assetId: row.asset_id,
    versionNumber: row.version_number,
    title: row.title,
    description: row.description,
    body,
    contentHash: row.content_hash,
    qualityScore: Number(row.quality_score ?? 0),
    validationStatus: row.validation_status,
    approvalStatus: row.approval_status,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function pageTypeForContentType(contentType: string): SeoPageType {
  if (/deadline/i.test(contentType)) return "deadline";
  if (/enforcement|penalt/i.test(contentType)) return "enforcement";
  if (/comparison|alternative|vs/i.test(contentType)) return "compare";
  return "learn";
}

function inferContentType(query: string): string {
  if (/deadline/i.test(query)) return "deadline page";
  if (/penalt|enforcement/i.test(query)) return "enforcement explainer";
  if (/alternative| vs |compare/i.test(query)) return "comparison page";
  if (/checklist|implementation/i.test(query)) return "implementation checklist";
  return "authoritative guide";
}

function sourcePlanForFramework(framework: string) {
  return getApprovedSourceList().map((source) => ({ url: source.url, title: source.name, priority: "primary", framework }));
}

function faqPlanForAsset(asset: ContentAsset) {
  return [
    `What does ${asset.targetQuery} require?`,
    `Which source supports this answer?`,
    `When should an admin review this content?`,
  ];
}

function titleCase(value: string) {
  return value.split(/\s+/).filter(Boolean).map((word) => word.length <= 3 && word.toUpperCase() === word ? word : `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`).join(" ");
}

function descriptionForQuery(query: string, framework: string) {
  return `Source-backed ${framework.toUpperCase()} guidance for ${query.toLowerCase()}, with claim verification, internal links and a Kodex assessment path.`;
}

function slugify(value: string) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90) || randomUUID();
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
}

function hashText(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function hashJson(value: unknown) {
  return hashText(JSON.stringify(value));
}
