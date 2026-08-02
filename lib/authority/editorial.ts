import "server-only";
import { getSeoSupabase } from "@/lib/seo/db";

export async function listEditorialItems() {
  const supabase = getSeoSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("authority_editorial_items")
    .select("id,title,content_type,framework,target_audience,primary_query,status,publish_ready,updated_at")
    .order("updated_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

export async function getEditorialItem(id: string) {
  const supabase = getSeoSupabase();
  if (!supabase) return null;
  const { data } = await supabase
    .from("authority_editorial_items")
    .select("*, authority_editorial_briefs(*), authority_editorial_revisions(*), authority_editorial_reviews(*)")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function updateEditorialStatus(id: string, status: string, actor?: string, notes?: string) {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const publishReady = status === "ready for publication";
  await supabase.from("authority_editorial_items").update({ status, publish_ready: publishReady, updated_by: actor, updated_at: new Date().toISOString() }).eq("id", id);
  await supabase.from("authority_editorial_reviews").insert({ editorial_item_id: id, review_type: "workflow", decision: status, notes, reviewer: actor });
  await supabase.from("audit_logs").insert({ actor, action: "update_status", entity_type: "authority_editorial_item", entity_id: id, payload: { status, notes } });
  return { ok: true };
}

export async function generateEditorialDraft(id: string, actor?: string) {
  const supabase = getSeoSupabase();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };
  const item = await getEditorialItem(id);
  if (!item) return { ok: false, error: "Editorial item not found." };
  const revisionNumber = ((item.authority_editorial_revisions ?? []) as Array<unknown>).length + 1;
  const content = [
    `# ${item.title}`,
    "",
    `Primary query: ${item.primary_query ?? item.title}`,
    "",
    "This draft requires verification against linked official sources before approval.",
    "",
    "Unsupported claims: none identified by the draft scaffold.",
  ].join("\n");
  await supabase.from("authority_editorial_revisions").insert({
    editorial_item_id: id,
    revision_number: revisionNumber,
    content,
    citations: [],
    unsupported_claims: [],
    created_by: actor,
  });
  await supabase.from("authority_editorial_items").update({ draft_content: content, status: "drafting", updated_by: actor, updated_at: new Date().toISOString() }).eq("id", id);
  await supabase.from("audit_logs").insert({ actor, action: "generate_draft", entity_type: "authority_editorial_item", entity_id: id, payload: { revisionNumber } });
  return { ok: true };
}
