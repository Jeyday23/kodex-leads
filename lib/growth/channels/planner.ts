// Weekly content planner for WS4 (replaces Pancake's Content Planner). Reads
// per-channel settings (seed defaults when Supabase is unconfigured), builds
// a Mon-Sun allocation that meets each channel's weekly_target exactly, and
// - for the day the planner is run - generates real drafts and Reddit
// opportunities through draft.ts and reddit-discovery.ts.
//
// Must not import "server-only": scripts/run-growth-planner.ts reaches this
// module under plain tsx.

import type { BrainContextBundle } from "@/lib/growth/context";
import { draftForChannel, type DraftChannel, type DraftForChannelResult } from "./draft";
import { discoverRedditThreads } from "./reddit-discovery";
import {
  createChannelDraft,
  getChannelSettings,
  getRecentAuditIssues,
  saveRedditOpportunities,
  type ChannelSettingsRow,
} from "./store";

export const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];

/** Fixed daily quota of site-audit-fix tasks the planner surfaces, independent of channel settings. */
export const DAILY_AUDIT_FIX_TARGET = 2;

export interface PlannerDay {
  day: WeekDay;
  auditFixTasks: number;
  /** One entry per drafted item that day, e.g. ["article_brief", "reddit", "reddit", "x", "linkedin"]. */
  channelTasks: DraftChannel[];
}

export interface WeekPlan {
  days: PlannerDay[];
  /** Total tasks allocated per channel across the week - must equal each enabled channel's weekly_target. */
  channelTotals: Record<string, number>;
}

/**
 * Distributes an enabled channel's weekly_target across the 7 days using the
 * largest-remainder method: every day gets floor(target / 7) tasks, and the
 * (target mod 7) days with the largest fractional remainder get one extra
 * task each. This guarantees the week's total exactly equals weekly_target
 * for every target, including targets not divisible by 7, and spreads the
 * remainder evenly rather than always weighting the first days of the week.
 */
function distributeAcrossWeek(weeklyTarget: number): number[] {
  const base = Math.floor(weeklyTarget / 7);
  const remainder = weeklyTarget - base * 7;
  const perDay = new Array(7).fill(base);

  // Assign the remainder to days 0, 2, 4, 6, 1, 3, 5 (spread rather than
  // front-loaded) so a small target does not always land only on Mon-Wed.
  const remainderOrder = [0, 2, 4, 6, 1, 3, 5];
  for (let i = 0; i < remainder; i += 1) {
    perDay[remainderOrder[i]] += 1;
  }
  return perDay;
}

/**
 * Pure allocation function: builds a 7-day plan meeting every enabled
 * channel's weekly_target exactly. Disabled channels get zero tasks. No I/O.
 */
export function allocateWeekPlan(settings: ChannelSettingsRow[]): WeekPlan {
  const days: PlannerDay[] = WEEK_DAYS.map((day) => ({ day, auditFixTasks: DAILY_AUDIT_FIX_TARGET, channelTasks: [] }));
  const channelTotals: Record<string, number> = {};

  for (const setting of settings) {
    channelTotals[setting.channel] = 0;
    if (!setting.enabled || setting.weeklyTarget <= 0) continue;

    const perDay = distributeAcrossWeek(setting.weeklyTarget);
    for (let i = 0; i < 7; i += 1) {
      for (let n = 0; n < perDay[i]; n += 1) {
        days[i].channelTasks.push(setting.channel);
      }
      channelTotals[setting.channel] += perDay[i];
    }
  }

  return { days, channelTotals };
}

/** Builds the current week's plan from live (or seed-fallback) channel settings. */
export async function buildWeekPlan(): Promise<WeekPlan> {
  const settings = await getChannelSettings();
  return allocateWeekPlan(settings);
}

function todayWeekDay(now: Date): WeekDay {
  // Date.getDay(): 0 = Sunday .. 6 = Saturday. WEEK_DAYS is Mon-Sun.
  const index = (now.getDay() + 6) % 7;
  return WEEK_DAYS[index];
}

function topicFor(channel: DraftChannel, bundle: BrainContextBundle, index: number): { topic: string; targetQuery?: string } {
  const pillar = bundle.messagePillars[index % Math.max(bundle.messagePillars.length, 1)];
  const keyword = bundle.keywords[index % Math.max(bundle.keywords.length, 1)];
  if (channel === "article_brief") {
    return { topic: pillar?.title ?? keyword?.term ?? bundle.profile.oneLineDescription, targetQuery: keyword?.term };
  }
  return { topic: pillar?.claim ?? keyword?.term ?? bundle.profile.oneLineDescription };
}

export interface PlannerRunSummary {
  day: WeekDay;
  draftsCreated: number;
  draftsSkipped: number;
  redditOpportunitiesFound: number;
  auditIssuesSurfaced: number;
  errors: string[];
}

/**
 * Runs today's slice of the week plan: drafts the day's allocated
 * article_brief / x / linkedin tasks, discovers Reddit threads for the day's
 * reddit task count, and surfaces (never auto-fixes) recent site-audit
 * issues. Every draft lands in `draft` status - nothing here is approved,
 * scheduled, or published.
 */
export async function runPlannerForToday(
  bundle: BrainContextBundle,
  options: { now?: Date; redditSubreddits?: string[] } = {},
): Promise<PlannerRunSummary> {
  const now = options.now ?? new Date();
  const day = todayWeekDay(now);
  const plan = await buildWeekPlan();
  const todayPlan = plan.days.find((entry) => entry.day === day) ?? plan.days[0];

  const errors: string[] = [];
  let draftsCreated = 0;
  let draftsSkipped = 0;

  const nonRedditTasks = todayPlan.channelTasks.filter((channel) => channel !== "reddit");
  for (let index = 0; index < nonRedditTasks.length; index += 1) {
    const channel = nonRedditTasks[index];
    const { topic, targetQuery } = topicFor(channel, bundle, index);
    let result: DraftForChannelResult;
    try {
      result = await draftForChannel(channel, { topic, targetQuery }, bundle);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `Draft generation failed for ${channel}.`);
      draftsSkipped += 1;
      continue;
    }

    if (result.status === "skipped") {
      draftsSkipped += 1;
      continue;
    }

    await createChannelDraft({
      channel: result.channel,
      title: result.title,
      body: result.body,
      sourceRef: { ...result.sourceRef, opportunityId: result.opportunityId ?? null },
      voiceSnapshot: result.voiceSnapshot,
      quality: result.quality,
      rationale: result.rationale,
      createdBy: "growth-channel-planner",
    });
    draftsCreated += 1;
  }

  const redditTaskCount = todayPlan.channelTasks.filter((channel) => channel === "reddit").length;
  let redditOpportunitiesFound = 0;
  if (redditTaskCount > 0) {
    const subreddits = options.redditSubreddits ?? ["eutaxation", "gdpr", "artificial"];
    try {
      const threads = await discoverRedditThreads(bundle.keywords, { subreddits, now: now.getTime() });
      const toSave = threads.slice(0, redditTaskCount * 3);
      redditOpportunitiesFound = await saveRedditOpportunities(toSave);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Reddit discovery failed.");
    }
  }

  const auditIssues = await getRecentAuditIssues(DAILY_AUDIT_FIX_TARGET);

  return {
    day,
    draftsCreated,
    draftsSkipped,
    redditOpportunitiesFound,
    auditIssuesSurfaced: auditIssues.length,
    errors,
  };
}
