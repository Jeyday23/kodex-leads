import { getSeoSupabase } from "@/lib/seo/db";
import { getSiteUrl } from "@/lib/seo/config";
import { searchConsoleStatus } from "@/lib/seo/source-intelligence";
import { listKnowledgeSources } from "@/lib/authority/knowledge";
import { getBrainContextBundle, type GrowthChannel } from "@/lib/growth/context";
import { getLatestAudits } from "@/lib/growth/audit/history";
import { getChannelSettings, listChannelDrafts, listRedditOpportunities } from "@/lib/growth/channels/store";
import { listSignalEvents } from "@/lib/growth/signals/store";
import { listLeadScores } from "@/lib/growth/leads/store";
import { buildCmoActionProposal, type CmoMutatingToolName } from "./actions";

export type CmoReadToolName =
  | "get_brain"
  | "get_site_audit_summary"
  | "get_visibility_summary"
  | "get_leads_summary"
  | "get_channel_status"
  | "get_search_console_summary";

export type CmoToolName = CmoReadToolName | CmoMutatingToolName;

export interface CmoToolResult {
  available: boolean;
  name: CmoToolName;
  data: Record<string, unknown>;
  note?: string;
}

function notAvailable(name: CmoToolName, detail?: string): CmoToolResult {
  return {
    available: false,
    name,
    data: {},
    note: detail ?? "Not available yet.",
  };
}

export async function getBrainTool(): Promise<CmoToolResult> {
  try {
    const bundle = await getBrainContextBundle();
    return {
      available: true,
      name: "get_brain",
      data: {
        profile: bundle.profile,
        personas: bundle.personas,
        keywords: bundle.keywords,
        messagePillars: bundle.messagePillars,
        competitors: bundle.competitors,
        signalConfigs: bundle.signalConfigs,
      },
      note: getSeoSupabase() ? undefined : "Supabase not configured; showing seed Brain context.",
    };
  } catch (error) {
    return notAvailable("get_brain", error instanceof Error ? error.message : undefined);
  }
}

export async function getSiteAuditSummaryTool(): Promise<CmoToolResult> {
  try {
    const url = getSiteUrl();
    const audits = await getLatestAudits(url);
    if (!getSeoSupabase()) return notAvailable("get_site_audit_summary", "Supabase not configured; no persisted audits are available yet.");
    return {
      available: true,
      name: "get_site_audit_summary",
      data: {
        url,
        latest: audits.map((audit) => ({
          kind: audit.kind,
          device: audit.device,
          score: audit.score,
          measuredAt: audit.measuredAt,
          issueCount: Array.isArray(audit.issues) ? audit.issues.length : 0,
        })),
      },
      note: audits.length === 0 ? "No site audit rows stored yet." : undefined,
    };
  } catch (error) {
    return notAvailable("get_site_audit_summary", error instanceof Error ? error.message : undefined);
  }
}

export async function getVisibilitySummaryTool(): Promise<CmoToolResult> {
  try {
    const knowledge = await listKnowledgeSources();
    const signals = await listSignalEvents({ limit: 25 });
    return {
      available: getSeoSupabase() !== null,
      name: "get_visibility_summary",
      data: {
        knowledgeSources: knowledge.length,
        recentSignals: signals.length,
        latestSignals: signals.slice(0, 5),
      },
      note: getSeoSupabase() ? undefined : "Supabase not configured; visibility tables are not available yet.",
    };
  } catch (error) {
    return notAvailable("get_visibility_summary", error instanceof Error ? error.message : undefined);
  }
}

export async function getLeadsSummaryTool(): Promise<CmoToolResult> {
  try {
    const scores = await listLeadScores(25);
    return {
      available: getSeoSupabase() !== null,
      name: "get_leads_summary",
      data: {
        recentScores: scores.length,
        topScores: scores.slice(0, 5),
      },
      note: getSeoSupabase() ? undefined : "Supabase not configured; lead scores are not available yet.",
    };
  } catch (error) {
    return notAvailable("get_leads_summary", error instanceof Error ? error.message : undefined);
  }
}

export async function getChannelStatusTool(): Promise<CmoToolResult> {
  try {
    const [settings, drafts, reddit] = await Promise.all([
      getChannelSettings(),
      listChannelDrafts({ limit: 200 }),
      listRedditOpportunities(100),
    ]);

    return {
      available: drafts.configured || reddit.configured || getSeoSupabase() !== null,
      name: "get_channel_status",
      data: {
        settings,
        draftsReady: drafts.items.filter((draft) => draft.status === "draft").length,
        pendingByChannel: settings.map((setting) => ({
          channel: setting.channel,
          enabled: setting.enabled,
          weeklyTarget: setting.weeklyTarget,
          drafts: drafts.items.filter((draft) => draft.channel === setting.channel && draft.status === "draft").length,
        })),
        redditOpportunities: reddit.items.length,
      },
      note: drafts.configured ? undefined : "Supabase not configured; channel draft history is not available yet.",
    };
  } catch (error) {
    return notAvailable("get_channel_status", error instanceof Error ? error.message : undefined);
  }
}

export async function getSearchConsoleSummaryTool(): Promise<CmoToolResult> {
  const status = searchConsoleStatus();
  return {
    available: status.status === "configured",
    name: "get_search_console_summary",
    data: status,
    note: status.note,
  };
}

export async function callCmoReadTool(name: CmoReadToolName): Promise<CmoToolResult> {
  switch (name) {
    case "get_brain":
      return getBrainTool();
    case "get_site_audit_summary":
      return getSiteAuditSummaryTool();
    case "get_visibility_summary":
      return getVisibilitySummaryTool();
    case "get_leads_summary":
      return getLeadsSummaryTool();
    case "get_channel_status":
      return getChannelStatusTool();
    case "get_search_console_summary":
      return getSearchConsoleSummaryTool();
  }
}

export async function callAllCmoReadTools(): Promise<CmoToolResult[]> {
  return Promise.all([
    getBrainTool(),
    getSiteAuditSummaryTool(),
    getVisibilitySummaryTool(),
    getLeadsSummaryTool(),
    getChannelStatusTool(),
    getSearchConsoleSummaryTool(),
  ]);
}

export function proposeChannelDraft(input: { channel?: string; topic: string; context?: string }) {
  const channel = input.channel && ["linkedin", "x", "reddit", "article_brief", "email"].includes(input.channel)
    ? input.channel
    : "linkedin";
  return buildCmoActionProposal("propose_channel_draft", `Draft ${channel} content`, {
    channel,
    topic: input.topic,
    context: input.context ?? null,
  });
}

export function proposeSiteAuditRun(input: { url?: string }) {
  return buildCmoActionProposal("propose_site_audit_run", "Run site audit", {
    url: input.url ?? getSiteUrl(),
  });
}

export function proposeSignalRun(input: { signalType?: string }) {
  return buildCmoActionProposal("propose_signal_run", "Run growth signals", {
    signalType: input.signalType ?? "all",
  });
}

export function proposeBrainUpdate(input: { summary: string; patch?: Record<string, unknown> }) {
  return buildCmoActionProposal("propose_brain_update", "Update Growth Brain", {
    summary: input.summary,
    patch: input.patch ?? {},
  });
}

export async function getMcpBrainTools() {
  const bundle = await getBrainContextBundle();
  return {
    get_brain: () => bundle,
    list_personas: () => bundle.personas,
    list_keywords: () => bundle.keywords,
    list_message_pillars: () => bundle.messagePillars,
    list_competitors: () => bundle.competitors,
    get_channel_voice: (channel: GrowthChannel = "linkedin") => bundle.channelVoices[channel] ?? bundle.channelVoices.linkedin,
  };
}

export async function searchKnowledge(query: string) {
  const items = await listKnowledgeSources({ search: query });
  return {
    available: getSeoSupabase() !== null,
    query,
    items,
    note: getSeoSupabase() ? undefined : "Supabase not configured; authority knowledge is not available yet.",
  };
}
