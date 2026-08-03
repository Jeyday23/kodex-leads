import "server-only";
import { getSeoSupabase } from "@/lib/seo/db";
import { getProviderStatuses } from "./providers";

export async function getAuthoritySystemStatus() {
  const supabase = getSeoSupabase();
  const providers = getProviderStatuses();
  const configuredProviders = providers.filter((provider) => provider.configured).length;

  if (!supabase) {
    return { level: "failed", label: "Database unavailable", lastSyncLabel: "not available", warnings: ["Supabase is not configured."] };
  }

  const [{ data: failure }, { data: discovery }, { data: monitoring }] = await Promise.all([
    supabase.from("job_failures").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("authority_discovery_runs").select("completed_at,status").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("monitoring_runs").select("completed_at,status").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const warnings = [
    ...(configuredProviders === 0 ? ["No LLM provider is configured."] : []),
    ...(failure ? ["Recent job failure recorded."] : []),
    ...(!discovery ? ["No discovery run recorded."] : []),
    ...(!monitoring ? ["No monitoring run recorded."] : []),
  ];

  const label = warnings.length === 0 ? "All systems operational" : configuredProviders === 0 ? "Configuration incomplete" : failure ? "Recent failures" : "Degraded";
  const lastSync = monitoring?.completed_at ?? discovery?.completed_at ?? null;
  return {
    level: warnings.length === 0 ? "ok" : configuredProviders === 0 || failure ? "warn" : "degraded",
    label,
    lastSyncLabel: lastSync ? relativeTime(new Date(lastSync)) : "never",
    warnings,
  };
}

function relativeTime(date: Date): string {
  const seconds = Math.max(Math.round((Date.now() - date.getTime()) / 1000), 0);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} days ago`;
}
