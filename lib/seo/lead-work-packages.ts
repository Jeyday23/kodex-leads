import "server-only";

import { createHash } from "node:crypto";
import { readWithAgentReach } from "./agent-reach";
import { getSeoSupabase } from "./db";
import {
  listLocalAuditEvents,
  storeAuditEventLocally,
  type DiscoveredLead,
  type StoredAuditEvent,
} from "./local-store";

export type LeadPackageDecision = "pending_approval" | "approved" | "rejected";

export interface LeadWorkPackage {
  packageId: string;
  leadId: string;
  companyName: string;
  website: string;
  source: string;
  sourceUrl: string;
  evidenceVerified: true;
  evidenceSummary: string;
  qualificationScore: number;
  qualificationReasons: string[];
  regulatoryFramework: string | null;
  triggerCategory: string | null;
  fineAmount: string | null;
  decisionMaker: {
    name: string | null;
    title: string | null;
    email: string | null;
    source: string | null;
  };
  researchBrief: {
    whyNow: string;
    evidence: string;
    kodexFit: string;
    recommendedApproach: string;
    cautions: string[];
  };
  outreachDraft: {
    subject: string;
    body: string;
  };
  decision: LeadPackageDecision;
  decisionBy: string | null;
  decisionAt: string | null;
  createdAt: string;
}

interface PackageEvent {
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

const QUEUED = "lead_outreach_package_queued";
const APPROVED = "lead_outreach_package_approved";
const REJECTED = "lead_outreach_package_rejected";
const PACKAGE_EVENTS = [QUEUED, APPROVED, REJECTED];

export async function createLeadWorkPackages(
  leads: DiscoveredLead[],
): Promise<{ queued: LeadWorkPackage[]; errors: string[] }> {
  const errors: string[] = [];
  const queued: LeadWorkPackage[] = [];
  const existing = await listLeadApprovalQueue(250);
  const known = new Set(existing.map((item) => item.packageId));
  const maxPerRun = Math.max(1, Math.min(Number(process.env.LEAD_PACKAGE_MAX_PER_RUN ?? 10) || 10, 20));
  const candidates = [...leads]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxPerRun);

  for (const lead of candidates) {
    const packageId = workPackageId(lead.companyName, lead.sourceUrl);
    if (known.has(packageId)) continue;

    const evidence = await verifyLeadEvidence(lead);
    if (!evidence.verified) {
      errors.push(`${lead.companyName}: evidence verification failed${evidence.error ? ` (${evidence.error})` : ""}`);
      continue;
    }

    const qualification = scoreLeadQualification(lead, true);
    if (qualification.score < 70) continue;

    const workPackage = buildLeadWorkPackage(lead, evidence.summary, qualification.score, qualification.reasons);
    const persistError = await persistPackageEvent(QUEUED, workPackage);
    if (persistError) errors.push(persistError);
    queued.push(workPackage);
    known.add(packageId);
  }

  return { queued, errors };
}

export function scoreLeadQualification(
  lead: Pick<DiscoveredLead, "confidence" | "triggerCategory" | "regulatoryFramework" | "decisionMakerName" | "decisionMakerTitle" | "contactEmail">,
  evidenceVerified: boolean,
): { score: number; reasons: string[] } {
  let score = Math.max(0, Math.min(100, lead.confidence));
  const reasons: string[] = [`Discovery confidence ${lead.confidence}/100`];

  if (evidenceVerified) {
    score += 10;
    reasons.push("Source evidence re-verified");
  }
  if (lead.triggerCategory === "enforcement_fine") {
    score += 10;
    reasons.push("Direct enforcement/fine trigger");
  } else if (lead.triggerCategory === "compliance_hiring" || lead.triggerCategory === "new_company") {
    score += 5;
    reasons.push("Strong commercial timing signal");
  }
  if (lead.regulatoryFramework) {
    score += 4;
    reasons.push(`Framework mapped: ${lead.regulatoryFramework}`);
  }
  if (lead.decisionMakerName || lead.decisionMakerTitle) {
    score += 6;
    reasons.push("Decision-maker role identified");
  }
  if (lead.contactEmail) {
    score += 5;
    reasons.push("Professional contact enriched");
  }

  return { score: Math.min(100, score), reasons };
}

export function buildLeadWorkPackage(
  lead: DiscoveredLead,
  evidenceSummary: string,
  qualificationScore: number,
  qualificationReasons: string[],
): LeadWorkPackage {
  const packageId = workPackageId(lead.companyName, lead.sourceUrl);
  const framework = lead.regulatoryFramework ?? "relevant EU compliance requirements";
  const buyerName = lead.decisionMakerName?.trim() || null;
  const greeting = buyerName ? `Hi ${buyerName.split(/\s+/)[0]},` : "Hello,";
  const angle = lead.outreachAngle ?? "turn the current trigger into defensible compliance evidence and a practical remediation plan";
  const factualTrigger = safeTriggerSentence(lead);

  return {
    packageId,
    leadId: lead.id,
    companyName: lead.companyName,
    website: lead.website,
    source: lead.source,
    sourceUrl: lead.sourceUrl,
    evidenceVerified: true,
    evidenceSummary,
    qualificationScore,
    qualificationReasons,
    regulatoryFramework: lead.regulatoryFramework ?? null,
    triggerCategory: lead.triggerCategory ?? null,
    fineAmount: lead.fineAmount ?? null,
    decisionMaker: {
      name: buyerName,
      title: lead.decisionMakerTitle ?? null,
      email: lead.contactEmail ?? null,
      source: lead.decisionMakerSource ?? null,
    },
    researchBrief: {
      whyNow: factualTrigger,
      evidence: evidenceSummary,
      kodexFit: `Kodex can help ${lead.companyName} convert ${framework} obligations into verifiable controls, evidence and remediation workflows rather than additional paperwork.`,
      recommendedApproach: angle,
      cautions: [
        "Use only the verified public-source facts in outreach.",
        "Do not imply additional violations, investigations or future fines.",
        "Human approval is required before any external message is sent.",
      ],
    },
    outreachDraft: {
      subject: `${lead.companyName}: ${shortFramework(framework)} evidence readiness`,
      body: `${greeting}\n\nI came across a public signal relevant to ${lead.companyName}: ${factualTrigger}\n\nKodex helps EU teams turn compliance requirements into evidence that can be demonstrated to customers, auditors and regulators. Based on this signal, a useful starting point could be to ${lowerFirst(angle)}\n\nIf this is relevant, I can share a short evidence-readiness view tailored to ${lead.companyName}.\n\nBest,\nJeremiah\nKodex Compliance`,
    },
    decision: "pending_approval",
    decisionBy: null,
    decisionAt: null,
    createdAt: new Date().toISOString(),
  };
}

export async function listLeadApprovalQueue(limit = 50): Promise<LeadWorkPackage[]> {
  const events = await readPackageEvents(Math.max(limit * 6, 120));
  const packages = new Map<string, LeadWorkPackage>();

  for (const event of [...events].reverse()) {
    const packageId = String(event.payload.packageId ?? "");
    if (!packageId) continue;
    if (event.eventType === QUEUED) {
      const candidate = event.payload as unknown as LeadWorkPackage;
      if (candidate.packageId && candidate.companyName && candidate.sourceUrl) packages.set(packageId, candidate);
      continue;
    }
    const current = packages.get(packageId);
    if (!current) continue;
    current.decision = event.eventType === APPROVED ? "approved" : "rejected";
    current.decisionBy = String(event.payload.actor ?? "founder");
    current.decisionAt = event.createdAt;
  }

  return [...packages.values()]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function decideLeadWorkPackage(
  packageId: string,
  decision: Exclude<LeadPackageDecision, "pending_approval">,
  actor: string,
): Promise<LeadWorkPackage> {
  const queue = await listLeadApprovalQueue(250);
  const current = queue.find((item) => item.packageId === packageId);
  if (!current) throw new Error("Lead work package not found.");

  const eventType = decision === "approved" ? APPROVED : REJECTED;
  const error = await persistPackageEvent(eventType, { packageId, actor, decision });
  if (error) throw new Error(error);

  return {
    ...current,
    decision,
    decisionBy: actor,
    decisionAt: new Date().toISOString(),
  };
}

async function verifyLeadEvidence(lead: DiscoveredLead): Promise<{ verified: boolean; summary: string; error?: string }> {
  try {
    const result = await readWithAgentReach(lead.sourceUrl);
    const text = normalize(result.content);
    const companyTokens = normalize(lead.companyName).split(/\s+/).filter((token) => token.length >= 4);
    const companyMatched = companyTokens.some((token) => text.includes(token));
    const triggerMatched = triggerTerms(lead.triggerCategory).some((term) => text.includes(term));
    if (!companyMatched && !triggerMatched) {
      return { verified: false, summary: "", error: "source text did not corroborate the company or trigger" };
    }

    const summary = `Public source re-read ${result.retrievedAt}; ${companyMatched ? "company identity matched" : "trigger language matched"}${triggerMatched ? " and trigger context corroborated" : ""}. Source: ${lead.sourceUrl}`;
    return { verified: true, summary };
  } catch (error) {
    return { verified: false, summary: "", error: error instanceof Error ? error.message : String(error) };
  }
}

async function persistPackageEvent(eventType: string, payload: Record<string, unknown> | LeadWorkPackage): Promise<string | null> {
  let persistenceError: string | null = null;
  const supabase = getSeoSupabase();
  if (supabase) {
    const { error } = await supabase.from("seo_audit_events").insert({ event_type: eventType, payload });
    if (error) persistenceError = `Supabase approval queue event: ${error.message}`;
  }

  await storeAuditEventLocally({ eventType, payload: payload as Record<string, unknown> });
  return persistenceError;
}

async function readPackageEvents(limit: number): Promise<PackageEvent[]> {
  const supabase = getSeoSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("seo_audit_events")
      .select("event_type,payload,created_at")
      .in("event_type", PACKAGE_EVENTS)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (!error && data) {
      return data.map((row) => ({
        eventType: String(row.event_type),
        payload: (row.payload ?? {}) as Record<string, unknown>,
        createdAt: String(row.created_at),
      }));
    }
  }

  const local = await listLocalAuditEvents(limit * 2);
  return local
    .filter((event: StoredAuditEvent) => PACKAGE_EVENTS.includes(event.eventType))
    .map((event) => ({ eventType: event.eventType, payload: event.payload, createdAt: event.createdAt }))
    .slice(0, limit);
}

function workPackageId(companyName: string, sourceUrl: string): string {
  const digest = createHash("sha256").update(`${normalize(companyName)}|${sourceUrl.trim().toLowerCase()}`).digest("hex").slice(0, 20);
  return `leadpkg_${digest}`;
}

function safeTriggerSentence(lead: Pick<DiscoveredLead, "companyName" | "triggerCategory" | "regulatoryFramework" | "fineAmount" | "fitReason">): string {
  if (lead.triggerCategory === "enforcement_fine") {
    return `a verified public enforcement source reports an enforcement/fine event involving ${lead.companyName}${lead.fineAmount ? ` (${lead.fineAmount})` : ""}.`;
  }
  if (lead.triggerCategory === "compliance_hiring") return `${lead.companyName} has a public compliance/privacy hiring signal relevant to ${lead.regulatoryFramework ?? "EU compliance"}.`;
  if (lead.triggerCategory === "new_company") return `${lead.companyName} has a recent public company-formation signal, creating an early compliance-foundation opportunity.`;
  if (lead.triggerCategory === "funding") return `${lead.companyName} has a recent public funding signal that can increase enterprise diligence and compliance pressure.`;
  if (lead.triggerCategory === "regulatory_exposure") return `${lead.companyName} has a public product or engineering signal relevant to ${lead.regulatoryFramework ?? "EU regulatory readiness"}.`;
  return lead.fitReason.split(".")[0] + ".";
}

function triggerTerms(category?: string | null): string[] {
  if (category === "enforcement_fine") return ["fine", "fined", "sanction", "enforcement", "penalty"];
  if (category === "compliance_hiring") return ["compliance", "privacy", "data protection", "gdpr", "dpo"];
  if (category === "new_company") return ["gmbh", "ug", "company", "register"];
  if (category === "funding") return ["funding", "raises", "raised", "investment", "series"];
  if (category === "regulatory_exposure" || category === "ai_product") return ["ai", "artificial intelligence", "machine learning"];
  return ["compliance", "regulatory"];
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9äöüß]+/g, " ").replace(/\s+/g, " ").trim();
}

function shortFramework(value: string): string {
  if (value.length <= 28) return value;
  return value.split("/")[0].trim().slice(0, 28);
}

function lowerFirst(value: string): string {
  const trimmed = value.trim().replace(/[.]$/, "");
  return trimmed ? `${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}.` : "review the evidence and remediation priorities.";
}
