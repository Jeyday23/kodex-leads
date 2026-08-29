import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { LeadCaptureInput, LeadScoreResult, SeoContentPage, SeoRevisionTask } from "./types";

const storePath = join(process.cwd(), ".data", "seo-store.json");

export interface StoredLead {
  id: string;
  createdAt: string;
  input: LeadCaptureInput;
  score: LeadScoreResult;
  attribution: {
    landing_page: string;
    content_id: string | null;
    search_query_cluster: string | null;
    first_touch_at: string;
    last_touch_at: string;
  };
  routing: RoutingStatus[];
}

export interface RoutingStatus {
  channel: "local" | "slack" | "hubspot";
  status: "stored" | "sent" | "skipped" | "failed";
  detail?: string;
  at: string;
}

export interface StoredAuditEvent {
  id: string;
  eventType: string;
  contentId?: string | null;
  sourceDocumentId?: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

export type LeadTriggerCategory =
  | "enforcement_fine"
  | "regulatory_exposure"
  | "new_company"
  | "compliance_hiring"
  | "funding"
  | "ai_product";

export interface DiscoveredLead {
  id: string;
  createdAt: string;
  companyName: string;
  website: string;
  segment: string;
  fitReason: string;
  suggestedSearchIntent: string;
  suggestedLandingPage: string;
  confidence: number;
  source: string;
  sourceUrl: string;
  retrievedAt: string;
  contactEmail?: string | null;
  enrichmentProvider?: string | null;
  triggerCategory?: LeadTriggerCategory;
  regulatoryFramework?: string | null;
  fineAmount?: string | null;
  decisionMakerName?: string | null;
  decisionMakerTitle?: string | null;
  decisionMakerSource?: string | null;
  outreachAngle?: string | null;
}

interface SeoStore {
  leads: StoredLead[];
  auditEvents: StoredAuditEvent[];
  discoveredLeads?: DiscoveredLead[];
  generatedPages?: SeoContentPage[];
  sourceSnapshots?: Record<string, { contentHash: string; checkedAt: string }>;
  revisionTasks?: SeoRevisionTask[];
}

async function readStore(): Promise<SeoStore> {
  try {
    const raw = await readFile(storePath, "utf8");
    return JSON.parse(raw) as SeoStore;
  } catch {
    return { leads: [], auditEvents: [], discoveredLeads: [] };
  }
}

async function writeStore(store: SeoStore) {
  await mkdir(dirname(storePath), { recursive: true });
  await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

export async function storeLeadLocally(lead: Omit<StoredLead, "id" | "createdAt">): Promise<StoredLead> {
  const store = await readStore();
  const stored: StoredLead = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...lead,
  };
  store.leads.unshift(stored);
  await writeStore(store);
  return stored;
}

export async function listLocalLeads(limit = 50): Promise<StoredLead[]> {
  const store = await readStore();
  return store.leads.slice(0, limit);
}

export async function storeAuditEventLocally(event: Omit<StoredAuditEvent, "id" | "createdAt">): Promise<StoredAuditEvent> {
  const store = await readStore();
  const stored: StoredAuditEvent = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...event,
  };
  store.auditEvents.unshift(stored);
  await writeStore(store);
  return stored;
}

export async function listLocalAuditEvents(limit = 50): Promise<StoredAuditEvent[]> {
  const store = await readStore();
  return store.auditEvents.slice(0, limit);
}

export async function storeDiscoveredLeadsLocally(leads: Omit<DiscoveredLead, "id" | "createdAt">[]): Promise<DiscoveredLead[]> {
  const store = await readStore();
  const discovered = leads.map((lead) => ({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...lead,
  }));
  store.discoveredLeads = [...discovered, ...(store.discoveredLeads ?? [])].slice(0, 300);
  await writeStore(store);
  return discovered;
}

export async function listDiscoveredLeads(limit = 50): Promise<DiscoveredLead[]> {
  const store = await readStore();
  return (store.discoveredLeads ?? [])
    .filter((lead) => Boolean(lead.sourceUrl) && lead.source !== "local-test" && lead.source !== "perplexity")
    .filter((lead) => lead.source !== "arbeitnow_jobs" || lead.fitReason.startsWith("Hiring signal"))
    .slice(0, limit);
}

export async function listGeneratedContentPages(): Promise<SeoContentPage[]> {
  const store = await readStore();
  return store.generatedPages ?? [];
}

export async function upsertGeneratedContentPage(page: SeoContentPage): Promise<SeoContentPage> {
  const store = await readStore();
  const pages = store.generatedPages ?? [];
  const routeKey = `${page.pageType}:${page.framework ?? ""}:${page.slug}`;
  const existingIndex = pages.findIndex((item) => `${item.pageType}:${item.framework ?? ""}:${item.slug}` === routeKey);
  const stored = { ...page, updatedAt: new Date().toISOString() };
  if (existingIndex >= 0) {
    pages[existingIndex] = { ...pages[existingIndex], ...stored };
  } else {
    pages.unshift(stored);
  }
  store.generatedPages = pages.slice(0, 200);
  await writeStore(store);
  return stored;
}

export async function updateGeneratedContentDecision(
  contentId: string,
  updates: Pick<SeoContentPage, "qualityScore" | "reviewStatus" | "noindex"> & { publishedAt?: string | null }
): Promise<void> {
  const store = await readStore();
  store.generatedPages = (store.generatedPages ?? []).map((page) =>
    page.id === contentId ? { ...page, ...updates, updatedAt: new Date().toISOString() } : page
  );
  await writeStore(store);
}

export async function getSourceSnapshot(sourceUrl: string): Promise<{ contentHash: string; checkedAt: string } | null> {
  const store = await readStore();
  return store.sourceSnapshots?.[sourceUrl] ?? null;
}

export async function storeSourceSnapshot(sourceUrl: string, contentHash: string, checkedAt: string): Promise<void> {
  const store = await readStore();
  store.sourceSnapshots = { ...(store.sourceSnapshots ?? {}), [sourceUrl]: { contentHash, checkedAt } };
  await writeStore(store);
}

export async function queueRevisionTasks(tasks: Omit<SeoRevisionTask, "id" | "createdAt" | "status">[]): Promise<SeoRevisionTask[]> {
  const store = await readStore();
  const existing = store.revisionTasks ?? [];
  const queued = tasks.map((task) => ({
    ...task,
    id: crypto.randomUUID(),
    status: "queued" as const,
    createdAt: new Date().toISOString(),
  }));
  store.revisionTasks = [...queued, ...existing].slice(0, 300);
  await writeStore(store);
  return queued;
}

export async function listRevisionTasks(limit = 50): Promise<SeoRevisionTask[]> {
  const store = await readStore();
  return (store.revisionTasks ?? []).slice(0, limit);
}
