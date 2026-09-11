// WS3 stack-detection provider. No credentials required: this is our own
// fingerprint matcher against publicly fetchable pages, so `status()` always
// reports configured. The pure matcher is exported separately so the
// fingerprints can be tested against inline HTML fixtures with no network.

import type { SignalConfig } from "@/lib/growth/context";
import type { SignalEventDraft, SignalProvider, SignalProviderStatus } from "../types";

export type StackMatchCategory = "trust_center" | "analytics" | "chat";

export interface StackMatch {
  tool: string;
  category: StackMatchCategory;
  evidence: string;
}

interface Fingerprint {
  tool: string;
  category: StackMatchCategory;
  pattern: RegExp;
}

// Trust-centre fingerprints are the strongest hiring/vendor signal (a company
// running one of these has already invested in a compliance program worth
// reaching out about). Analytics/chat tools are weaker corroborating signal.
const FINGERPRINTS: Fingerprint[] = [
  { tool: "Vanta", category: "trust_center", pattern: /trust\.vanta\.com|vanta\.com\/embed|powered by vanta/i },
  { tool: "Drata", category: "trust_center", pattern: /trust\.drata\.com|drata\.com\/trust|powered by drata/i },
  { tool: "Secureframe", category: "trust_center", pattern: /trust\.secureframe\.com|secureframe\.com\/trust|powered by secureframe/i },
  { tool: "Sprinto", category: "trust_center", pattern: /trust\.sprinto\.com|sprinto\.com\/trust|powered by sprinto/i },
  { tool: "Google Analytics", category: "analytics", pattern: /googletagmanager\.com\/gtag\/js|www\.google-analytics\.com\/analytics\.js/i },
  { tool: "Segment", category: "analytics", pattern: /cdn\.segment\.com\/analytics\.js/i },
  { tool: "Mixpanel", category: "analytics", pattern: /cdn\.mxpnl\.com/i },
  { tool: "Intercom", category: "chat", pattern: /widget\.intercom\.io|intercomcdn\.com/i },
  { tool: "Drift", category: "chat", pattern: /js\.driftt\.com/i },
  { tool: "HubSpot", category: "chat", pattern: /js\.hs-scripts\.com|js\.hsforms\.net|hs-analytics\.net/i },
];

/**
 * Pure matcher: scans raw HTML for known fingerprints. Exported for direct
 * testing on HTML fixtures with no network involved.
 */
export function matchStackFingerprints(html: string): StackMatch[] {
  const matches: StackMatch[] = [];
  for (const fingerprint of FINGERPRINTS) {
    const found = html.match(fingerprint.pattern);
    if (found) {
      matches.push({ tool: fingerprint.tool, category: fingerprint.category, evidence: found[0] });
    }
  }
  return matches;
}

async function fetchPage(url: string, fetchImpl: typeof fetch): Promise<string | null> {
  try {
    const response = await fetchImpl(url, {
      headers: { "user-agent": "KodexGrowthStackDetector/1.0" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

export interface StackDetectionOptions {
  fetchImpl?: typeof fetch;
}

/**
 * Fetches a prospect's homepage plus /security and /trust and runs the pure
 * matcher against the combined HTML. Any page that fails to fetch is simply
 * skipped; a partial result is still useful.
 */
export async function detectStackForDomain(domain: string, options?: StackDetectionOptions): Promise<StackMatch[]> {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const base = domain.startsWith("http") ? domain.replace(/\/$/, "") : `https://${domain}`;

  const pages = await Promise.all(
    [base, `${base}/security`, `${base}/trust`].map((url) => fetchPage(url, fetchImpl)),
  );

  const combined = pages.filter((page): page is string => page !== null).join("\n");
  return matchStackFingerprints(combined);
}

export const stackSignalProvider: SignalProvider = {
  id: "signal-stack",
  label: "Vendor stack detector",
  status(): SignalProviderStatus {
    return { configured: true, missing: [] };
  },
  async run(config: SignalConfig): Promise<SignalEventDraft[]> {
    const domains = config.targets;
    if (domains.length === 0) return [];

    const events: SignalEventDraft[] = [];
    const detectedAt = new Date().toISOString();

    for (const domain of domains) {
      const matches = await detectStackForDomain(domain);
      for (const match of matches) {
        if (match.category !== "trust_center") continue; // corroborating tools alone are not a lead signal
        events.push({
          type: "stack",
          source: "stack-detector",
          companyDomain: domain,
          evidence: { tool: match.tool, category: match.category, evidence: match.evidence },
          url: `https://${domain}`,
          strength: 0.7,
          dedupeKey: `stack:${domain}:${match.tool}`,
          detectedAt,
        });
      }
    }

    return events;
  },
};
