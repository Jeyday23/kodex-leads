import "server-only";
import { createHash } from "node:crypto";
import { getSeoSupabase } from "@/lib/seo/db";

export async function listKnowledgeSources(filters: { framework?: string | null; search?: string | null } = {}) {
  const supabase = getSeoSupabase();
  if (!supabase) return [];
  let query = supabase
    .from("authority_knowledge_sources")
    .select("id,title,source_organization,source_type,jurisdiction,framework,official_url,verification_status,superseded,last_checked_at,updated_at")
    .order("updated_at", { ascending: false })
    .limit(50);
  if (filters.framework) query = query.eq("framework", filters.framework);
  if (filters.search) query = query.ilike("title", `%${filters.search}%`);
  const { data } = await query;
  return data ?? [];
}

export async function getKnowledgeSource(id: string) {
  const supabase = getSeoSupabase();
  if (!supabase) return null;
  const { data } = await supabase
    .from("authority_knowledge_sources")
    .select("*, authority_knowledge_versions(*), authority_knowledge_obligations(*), authority_knowledge_reviews(*)")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function verifyKnowledgeSource(id: string, actor?: string, decision = "verified", notes?: string) {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  await supabase.from("authority_knowledge_sources").update({ verification_status: decision, reviewed_by: actor, updated_at: new Date().toISOString() }).eq("id", id);
  await supabase.from("authority_knowledge_reviews").insert({ knowledge_source_id: id, reviewer: actor, decision, notes });
  await supabase.from("audit_logs").insert({ actor, action: "review", entity_type: "authority_knowledge_source", entity_id: id, payload: { decision, notes } });
  return { ok: true };
}

export async function checkKnowledgeSource(id: string, actor?: string) {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const source = await getKnowledgeSource(id);
  if (!source) return { ok: false, error: "Knowledge source not found." };
  if (!process.env.SEO_SOURCE_FETCH_ENABLED || process.env.SEO_SOURCE_FETCH_ENABLED !== "true") {
    return { ok: false, error: "SEO_SOURCE_FETCH_ENABLED is not true." };
  }
  if (!String(source.official_url).startsWith("http")) return { ok: false, error: "Only public official URLs can be fetched." };
  const response = await fetch(source.official_url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) return { ok: false, error: `Source returned HTTP ${response.status}.` };
  const snapshot = await response.text();
  const hash = createHash("sha256").update(snapshot).digest("hex");
  const changed = source.content_hash && source.content_hash !== hash;
  await supabase.from("authority_knowledge_versions").insert({
    knowledge_source_id: id,
    content_hash: hash,
    snapshot: snapshot.slice(0, 50000),
    change_summary: changed ? "Source content changed since last retrieval." : "No content hash change detected.",
  });
  await supabase.from("authority_knowledge_sources").update({
    content_hash: hash,
    last_checked_at: new Date().toISOString(),
    verification_status: changed ? "changed" : source.verification_status,
  }).eq("id", id);
  await supabase.from("audit_logs").insert({ actor, action: "check_source", entity_type: "authority_knowledge_source", entity_id: id, payload: { changed } });
  return { ok: true, changed };
}
