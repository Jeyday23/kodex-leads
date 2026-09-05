// Intentionally NOT marked "server-only": this module is shared with the Render
// cron jobs and workers in scripts/ and workers/, which run under plain tsx.
// Same reasoning as lib/seo/eu-dpa-enforcement.ts. No credential is read here:
// Bidledger is a keyless static mirror of the EU Official Journal.

import type { DiscoveredLead } from "./local-store";

/**
 * EU public-procurement lead discovery.
 *
 * Source: Bidledger (https://jaydemks.github.io/bidledger/api.html), a static
 * daily rebuild of Tenders Electronic Daily, the EU Official Journal's tender
 * feed. No key, no sign-up, no rate limit, CORS open, and closed calls are
 * dropped the day their deadline passes, so anything returned is still live.
 *
 * Why this is a lead source and not just news: a public body publishing a
 * tender for GDPR remediation, an ISO 27001 audit or a DPO mandate has a
 * budget, a deadline and a named buyer. That is a stronger buying signal than
 * an enforcement notice, which only tells you someone has a problem.
 *
 * Verified against the live API on 2026-09-05: 32,017 open notices across 48
 * countries. The three CPV divisions below hold 5,333 of them, of which 208
 * matched the compliance signal below. The filter is deliberately narrow: a
 * discovery source that returns everything is the same as one that returns
 * nothing.
 */

const BIDLEDGER_API = "https://jaydemks.github.io/bidledger/api";

/** CPV divisions where compliance work is actually procured. Labels are the API's own. */
export const TENDER_DIVISIONS = [
  { division: "48", label: "Software packages and information systems" },
  { division: "72", label: "IT services: consulting, software development and support" },
  { division: "79", label: "Business services: law, marketing, consulting, recruitment" },
] as const;

/**
 * Frameworks Kodex actually sells against, in the languages the notices are
 * written in. Order matters: the first match becomes regulatoryFramework.
 */
// German, Polish and Dutch build compound nouns, so a trailing \b is wrong:
// "Datenschutzbeauftragter" has no boundary after "datenschutz". Stems that
// appear inside compounds are anchored at the start only. Latin-script
// abbreviations that could collide with other words keep both anchors.
const FRAMEWORK_SIGNALS: Array<{ framework: string; pattern: RegExp }> = [
  { framework: "GDPR", pattern: /\b(gdpr|dsgvo|rgpd|dpo)\b|\b(datenschutz|gegevensbescherming)|\b(data protection|privacy)\b/i },
  { framework: "EU AI Act", pattern: /\b(ai act|artificial intelligence act)\b|\b(ki-verordnung|ki-gesetz)/i },
  { framework: "NIS2", pattern: /\bnis-?\s?2\b/i },
  { framework: "DORA", pattern: /\bdora\b/i },
  { framework: "ISO 27001", pattern: /\biso[ /-]?27001\b/i },
  { framework: "Whistleblower Directive", pattern: /\b(whistleblow|hinweisgeber|klokkenluider)/i },
  { framework: "Information security", pattern: /\b(information ?security|data security|cyber ?security)\b|\b(informationssicherheit|cyberbezpiecze|cybersicherheit)/i },
  { framework: "Compliance audit", pattern: /\b(compliance|audit)\b|\b(conformit|konformit)/i },
];

export interface TenderNotice {
  id: string;
  title: string;
  buyer: string;
  country: string;
  country_name: string;
  cpv_main_label: string;
  contract_nature: string;
  published: string;
  deadline: string;
  url: string;
  ted_url: string;
}

/** The framework this notice is about, or null when it is not compliance work. */
export function matchFramework(notice: Pick<TenderNotice, "title" | "buyer">): string | null {
  const haystack = `${notice.title ?? ""} ${notice.buyer ?? ""}`;
  for (const { framework, pattern } of FRAMEWORK_SIGNALS) {
    if (pattern.test(haystack)) return framework;
  }
  return null;
}

/**
 * Bidledger drops closed calls daily, but "daily" leaves up to 24 hours of
 * stale rows. A tender whose deadline has passed is not a lead.
 */
export function isOpenTender(notice: Pick<TenderNotice, "deadline">, now = new Date()): boolean {
  if (!notice.deadline) return false;
  const deadline = new Date(notice.deadline);
  if (Number.isNaN(deadline.getTime())) return false;
  return deadline.getTime() > now.getTime();
}

/**
 * Confidence reflects how directly the notice names a framework Kodex covers.
 * A notice naming the AI Act is a better lead than one that merely says "audit".
 * Deliberately below the 96 used for EDPB enforcement: a tender is an intent
 * signal, an enforcement action is a confirmed fact.
 */
export function tenderConfidence(framework: string): number {
  if (framework === "Compliance audit") return 62;
  if (framework === "Information security") return 70;
  return 84;
}

export function tenderToLead(
  notice: TenderNotice,
  framework: string,
): Omit<DiscoveredLead, "id" | "createdAt"> {
  const deadline = notice.deadline ? notice.deadline.slice(0, 10) : "an unstated date";
  return {
    // The buyer is the organisation with the budget. The title names the work.
    companyName: notice.buyer,
    website: notice.ted_url,
    segment: `EU public procurement (${notice.country_name})`,
    fitReason:
      `Published an open EU tender closing ${deadline}: "${notice.title}". ` +
      `Signal matched: ${framework}. This is a public procurement notice on TED, ` +
      `so the requirement and the deadline are stated by the buyer. It is not ` +
      `evidence of any deficiency on their part.`,
    suggestedSearchIntent: `${framework.toLowerCase()} compliance provider for public sector procurement`,
    suggestedLandingPage: "/assess/gdpr",
    confidence: tenderConfidence(framework),
    source: "eu_ted_tenders",
    sourceUrl: notice.ted_url,
    retrievedAt: new Date().toISOString(),
    triggerCategory: "regulatory_exposure",
    regulatoryFramework: framework,
    fineAmount: null,
    outreachAngle:
      `Reference the tender by its TED number (${notice.id}) and its ${deadline} deadline. ` +
      `Lead with the specific requirement in the title, not with a generic compliance pitch.`,
  };
}

/** Guards against a schema change silently turning into zero leads. */
function isTenderNotice(value: unknown): value is TenderNotice {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === "string" && typeof row.title === "string" && typeof row.buyer === "string";
}

export async function discoverEuTenderLeads(options?: {
  /** Cap per run so one noisy division cannot flood the approval queue. */
  limit?: number;
  fetchImpl?: typeof fetch;
}): Promise<{ leads: DiscoveredLead[]; errors: string[] }> {
  const limit = options?.limit ?? 40;
  const doFetch = options?.fetchImpl ?? fetch;
  const errors: string[] = [];
  const seen = new Set<string>();
  const rows: Array<Omit<DiscoveredLead, "id" | "createdAt">> = [];

  for (const { division, label } of TENDER_DIVISIONS) {
    try {
      const response = await doFetch(`${BIDLEDGER_API}/s/${division}.json`, {
        headers: { accept: "application/json", "user-agent": "KodexLeadResearch/2.0" },
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) {
        errors.push(`Bidledger CPV ${division} (${label}): HTTP ${response.status}`);
        continue;
      }

      const payload: unknown = await response.json();
      if (!Array.isArray(payload)) {
        errors.push(`Bidledger CPV ${division}: expected an array of notices, got ${typeof payload}. The API shape may have changed.`);
        continue;
      }

      const notices = payload.filter(isTenderNotice);
      if (payload.length > 0 && notices.length === 0) {
        errors.push(`Bidledger CPV ${division}: ${payload.length} rows returned but none had id/title/buyer. The API shape may have changed.`);
        continue;
      }

      for (const notice of notices) {
        if (!isOpenTender(notice)) continue;
        const framework = matchFramework(notice);
        if (!framework) continue;
        if (seen.has(notice.id)) continue;
        seen.add(notice.id);
        rows.push(tenderToLead(notice, framework));
      }
    } catch (error) {
      errors.push(`Bidledger CPV ${division} (${label}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Highest-confidence first, so the cap keeps the best rather than the earliest.
  rows.sort((a, b) => b.confidence - a.confidence);

  const leads: DiscoveredLead[] = rows.slice(0, limit).map((row) => ({
    ...row,
    id: `eu-tender-${row.sourceUrl.split("/").pop() ?? Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
  }));

  return { leads, errors };
}
