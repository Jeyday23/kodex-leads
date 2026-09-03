import { revalidatePath } from "next/cache";
import { getSeoSupabase } from "./db";
import { getAllSeoPages, getPendingSeoPages } from "./content";
import { generateAndPersistDrafts } from "./content-generation";
import { evaluateQuality } from "./quality-gate";
import { pathForSeoPage } from "./urls";
import type { SeoContentPage } from "./types";
import { checkApprovedSources, searchConsoleStatus, type SourceCheckResult } from "./source-intelligence";
import { storeAuditEventLocally, updateGeneratedContentDecision } from "./local-store";
import { deriveTopicGraph } from "./topic-graph";
import { runGoogleDiscoveryCycle, type GoogleDiscoveryCycleResult } from "./google-search-console";

export interface SeoCycleResult {
  checkedAt: string;
  mode: "database" | "seed";
  evaluatedPages: number;
  generatedDrafts: number;
  published: string[];
  queuedForReview: string[];
  rejected: string[];
  revalidated: string[];
  sourceChecks: SourceCheckResult[];
  searchConsole: ReturnType<typeof searchConsoleStatus>;
  googleDiscovery: GoogleDiscoveryCycleResult | null;
  nextActions: string[];
}

function inputForPage(page: SeoContentPage) {
  return {
    authoritativeSources: page.sources.length,
    unsupportedClaims: page.body.sections.reduce((count, section) => count + (section.claims?.length ?? 0), 0),
    similarityScore: 0,
    internalLinks: page.internalLinks.length,
    hasConversionAction: Boolean(page.body.nextAction || page.targetTool),
    hasCanonical: true,
    datesValidated: page.sources.every((source) => Boolean(source.publishedAt || source.effectiveAt)),
    hasParentHub: page.pageType === "hub" || page.internalLinks.some((link) => link.relationship === "parent" || link.relationship === "cluster"),
    hasPenaltyClaims: page.body.sections.some((section) => /penalt|fine/i.test(`${section.heading} ${section.body}`)),
    penaltyClaimsSourced: page.sources.some((source) => /penalt|fine/i.test(source.supportedClaim ?? "")),
    legalInterpretation: page.legalInterpretation,
  };
}

async function persistDecision(page: SeoContentPage, score: number, decision: "publish" | "review" | "reject", noindex: boolean) {
  const supabase = getSeoSupabase();
  if (!supabase) {
    await storeAuditEventLocally({
      eventType: `seo_quality_${decision}`,
      contentId: page.id,
      payload: { score, noindex, route: pathForSeoPage(page), storage: "local" },
    });
    await updateGeneratedContentDecision(page.id, {
      qualityScore: score,
      reviewStatus: decision === "publish" ? "published" : decision === "reject" ? "rejected" : "review",
      noindex,
      publishedAt: decision === "publish" ? new Date().toISOString() : page.publishedAt,
    });
    return;
  }

  const reviewStatus = decision === "publish" ? "published" : decision;
  const updates = {
    quality_score: score,
    review_status: reviewStatus,
    noindex,
    published_at: decision === "publish" ? new Date().toISOString() : page.publishedAt,
    updated_at: new Date().toISOString(),
  };

  await supabase.from("content_pages").update(updates).eq("id", page.id);
  await supabase.from("seo_audit_events").insert({
    event_type: `seo_quality_${decision}`,
    content_id: page.id,
    payload: { score, noindex, route: pathForSeoPage(page) },
  });
}

export async function runSeoIntelligenceCycle(): Promise<SeoCycleResult> {
  const checkedAt = new Date().toISOString();
  const sourceChecks = await checkApprovedSources();
  const existingPages = await getAllSeoPages();
  const generatedDrafts = await generateAndPersistDrafts(deriveTopicGraph(sourceChecks, existingPages), sourceChecks);
  const pages = await getPendingSeoPages();
  const mode = getSeoSupabase() ? "database" : "seed";
  const result: SeoCycleResult = {
    checkedAt,
    mode,
    evaluatedPages: pages.length,
    generatedDrafts: generatedDrafts.length,
    published: [],
    queuedForReview: [],
    rejected: [],
    revalidated: [],
    sourceChecks,
    searchConsole: searchConsoleStatus(),
    googleDiscovery: null,
    nextActions: [],
  };

  if (mode === "seed") {
    result.nextActions.push("Configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to persist production content decisions.");
  }

  if (result.searchConsole.status === "missing_credentials") {
    result.nextActions.push("Configure Google Search Console credentials to submit the sitemap and inspect indexing status.");
  }

  if (sourceChecks.some((check) => check.status === "configured")) {
    result.nextActions.push("Set SEO_SOURCE_FETCH_ENABLED=true to fetch and hash approved compliance sources during cron.");
  }

  for (const page of pages) {
    const evaluation = evaluateQuality(inputForPage(page));
    await persistDecision(page, evaluation.score, evaluation.decision, evaluation.noindex);

    if (evaluation.decision === "publish") {
      const path = pathForSeoPage(page);
      revalidatePath(path);
      revalidatePath("/sitemap.xml");
      result.published.push(page.id);
      result.revalidated.push(path);
    } else if (evaluation.decision === "review") {
      result.queuedForReview.push(page.id);
    } else {
      result.rejected.push(page.id);
    }
  }

  if (result.searchConsole.status === "configured") {
    try {
      result.googleDiscovery = await runGoogleDiscoveryCycle(20);
    } catch (error) {
      result.nextActions.push(`Google discovery cycle failed: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  await storeAuditEventLocally({
    eventType: "seo_cron_completed",
    payload: {
      mode,
      evaluatedPages: result.evaluatedPages,
      generatedDrafts: result.generatedDrafts,
      published: result.published.length,
      queuedForReview: result.queuedForReview.length,
      rejected: result.rejected.length,
      sourceChecks: result.sourceChecks.map((check) => ({ name: check.name, status: check.status })),
      searchConsole: result.searchConsole.status,
      googleDiscovery: result.googleDiscovery
        ? {
            configured: result.googleDiscovery.configured,
            sitemapSubmitted: result.googleDiscovery.sitemapSubmitted,
            inspected: result.googleDiscovery.inspected.length,
          }
        : null,
    },
  });

  return result;
}
