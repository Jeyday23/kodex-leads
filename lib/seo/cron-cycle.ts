import { revalidatePath } from "next/cache";
import { getSeoSupabase } from "./db";
import { getPendingSeoPages } from "./content";
import { evaluateQuality } from "./quality-gate";
import { pathForSeoPage } from "./urls";
import type { SeoContentPage } from "./types";
import { checkApprovedSources, searchConsoleStatus, type SourceCheckResult } from "./source-intelligence";
import { storeAuditEventLocally } from "./local-store";

export interface SeoCycleResult {
  checkedAt: string;
  mode: "database" | "seed";
  evaluatedPages: number;
  published: string[];
  queuedForReview: string[];
  rejected: string[];
  revalidated: string[];
  sourceChecks: SourceCheckResult[];
  searchConsole: ReturnType<typeof searchConsoleStatus>;
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
  const pages = await getPendingSeoPages();
  const mode = getSeoSupabase() ? "database" : "seed";
  const result: SeoCycleResult = {
    checkedAt,
    mode,
    evaluatedPages: pages.length,
    published: [],
    queuedForReview: [],
    rejected: [],
    revalidated: [],
    sourceChecks,
    searchConsole: searchConsoleStatus(),
    nextActions: [],
  };

  if (mode === "seed") {
    result.nextActions.push("Configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to persist production content decisions.");
  }

  if (result.searchConsole.status === "missing_credentials") {
    result.nextActions.push("Configure Google Search Console credentials to ingest live query, impression, click and rank data.");
  }

  if (sourceChecks.some((check) => check.status === "configured")) {
    result.nextActions.push("Set SEO_SOURCE_FETCH_ENABLED=true to fetch and hash approved SEO sources during cron.");
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

  await storeAuditEventLocally({
    eventType: "seo_cron_completed",
    payload: {
      mode,
      evaluatedPages: result.evaluatedPages,
      published: result.published.length,
      queuedForReview: result.queuedForReview.length,
      rejected: result.rejected.length,
      sourceChecks: result.sourceChecks.map((check) => ({ name: check.name, status: check.status })),
      searchConsole: result.searchConsole.status,
    },
  });

  return result;
}
