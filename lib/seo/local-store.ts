import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { LeadCaptureInput, LeadScoreResult } from "./types";

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
  source: "local-test" | "perplexity" | "openai" | "anthropic";
}

interface SeoStore {
  leads: StoredLead[];
  auditEvents: StoredAuditEvent[];
  discoveredLeads?: DiscoveredLead[];
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
  store.discoveredLeads = [...discovered, ...(store.discoveredLeads ?? [])].slice(0, 200);
  await writeStore(store);
  return discovered;
}

export async function listDiscoveredLeads(limit = 50): Promise<DiscoveredLead[]> {
  const store = await readStore();
  return (store.discoveredLeads ?? []).slice(0, limit);
}
