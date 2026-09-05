// Intentionally NOT marked "server-only": shared with the Render cron jobs and
// workers in scripts/ and workers/, which run under plain tsx. Same reasoning
// as lib/seo/lead-work-packages.ts. No credential is read here.

/**
 * Domain deliverability screening for outreach candidates.
 *
 * Source: Disify (https://disify.com), keyless. Verified against the live API
 * on 2026-09-05 with four cases, and the shapes in the tests are copied from
 * those responses rather than invented.
 *
 * What this is for. The approval queue is the expensive part of the pipeline:
 * every package costs Bedrock tokens to draft and a human decision to clear. A
 * lead whose domain has no MX record can never receive the email, so drafting
 * outreach for it wastes both. Screening happens before the draft, and the
 * result becomes a caution on the package rather than a silent drop, because
 * the founder approves every send and should see why a lead looks weak.
 *
 * Note on `confidence`: Disify reports confidence that a domain IS disposable.
 * gmail.com returns 0, mailinator.com returns 100. Higher is worse. It is
 * deliberately not reused as a lead score.
 */

const DISIFY_API = "https://disify.com/api/domain";

/** Fields observed on live responses. Everything optional is genuinely absent sometimes. */
export interface DomainCheck {
  format: boolean;
  domain: string;
  disposable: boolean;
  dns: boolean;
  confidence: number;
  role: boolean;
  free: boolean;
  whitelist?: boolean;
  signals?: string[];
  mx_info?: string[];
}

export type DeliverabilityVerdict = "deliverable" | "undeliverable" | "not_a_business" | "unknown";

export interface DeliverabilityResult {
  domain: string;
  verdict: DeliverabilityVerdict;
  /** Written for a human reading the approval queue, not for a log. */
  caution: string | null;
  mxHosts: string[];
  checkedAt: string;
  error?: string;
}

/** Pulls the registrable domain out of a URL or an email address. */
export function extractDomain(input: string | null | undefined): string | null {
  if (!input) return null;
  const value = input.trim();
  if (!value) return null;

  const afterAt = value.includes("@") ? value.slice(value.lastIndexOf("@") + 1) : value;
  const withoutScheme = afterAt.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  const host = withoutScheme.split(/[/?#]/)[0]?.split(":")[0]?.trim().toLowerCase();
  if (!host) return null;
  // A hostname needs at least one dot and no whitespace to be worth querying.
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host)) return null;
  return host.replace(/^www\./, "");
}

/**
 * Turns a Disify payload into a verdict. Kept pure so the mapping is testable
 * without the network, which is where the interesting mistakes live.
 */
export function classifyDomain(check: DomainCheck): { verdict: DeliverabilityVerdict; caution: string | null } {
  if (check.dns === false) {
    return {
      verdict: "undeliverable",
      caution: `${check.domain} has no MX records, so outreach to this domain cannot be delivered. Verify the company website before approving.`,
    };
  }
  if (check.disposable) {
    return {
      verdict: "undeliverable",
      caution: `${check.domain} is a disposable email domain. This is not a real organisation contact.`,
    };
  }
  if (check.free) {
    return {
      verdict: "not_a_business",
      caution: `${check.domain} is a free consumer mail provider, not a company domain. Confirm this is the right contact before approving.`,
    };
  }
  if (check.role) {
    return {
      verdict: "deliverable",
      caution: `${check.domain} resolves to a role address rather than a named person. Expect a lower reply rate.`,
    };
  }
  return { verdict: "deliverable", caution: null };
}

function looksLikeDomainCheck(value: unknown): value is DomainCheck {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.domain === "string" && typeof row.disposable === "boolean" && typeof row.dns === "boolean";
}

/**
 * Never throws and never blocks the pipeline. An unreachable checker returns
 * "unknown", which adds no caution: a screening service being down is not a
 * reason to hold back a lead the founder can judge for themselves.
 */
export async function checkDomainDeliverability(
  input: string | null | undefined,
  options?: { fetchImpl?: typeof fetch },
): Promise<DeliverabilityResult> {
  const doFetch = options?.fetchImpl ?? fetch;
  const checkedAt = new Date().toISOString();
  const domain = extractDomain(input);

  if (!domain) {
    return { domain: "", verdict: "unknown", caution: null, mxHosts: [], checkedAt, error: "No domain could be read from the input." };
  }

  try {
    const response = await doFetch(`${DISIFY_API}/${encodeURIComponent(domain)}`, {
      headers: { accept: "application/json", "user-agent": "KodexLeadResearch/2.0" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      return { domain, verdict: "unknown", caution: null, mxHosts: [], checkedAt, error: `Disify: HTTP ${response.status}` };
    }

    const payload: unknown = await response.json();
    if (!looksLikeDomainCheck(payload)) {
      return { domain, verdict: "unknown", caution: null, mxHosts: [], checkedAt, error: "Disify returned an unexpected shape; the API may have changed." };
    }

    const { verdict, caution } = classifyDomain(payload);
    return { domain, verdict, caution, mxHosts: payload.mx_info ?? [], checkedAt };
  } catch (error) {
    return {
      domain,
      verdict: "unknown",
      caution: null,
      mxHosts: [],
      checkedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
