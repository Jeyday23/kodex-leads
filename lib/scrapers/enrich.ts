import { type EnrichResult, delay } from "./types";

interface EnrichInput {
  company: string;
  domain?: string;
}

async function tryDropcontact(domain: string): Promise<string | null> {
  const key = process.env.DROPCONTACT_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch("https://api.dropcontact.com/batch", {
      method: "POST",
      headers: {
        "X-Access-Token": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: [{ company: domain }],
        seniority: false,
        language: "en",
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0]?.email?.[0]?.email ?? null;
  } catch {
    return null;
  }
}

async function tryHunter(domain: string): Promise<string | null> {
  const key = process.env.HUNTER_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${key}&limit=1`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.emails?.[0]?.value ?? null;
  } catch {
    return null;
  }
}

async function tryApollo(domain: string): Promise<string | null> {
  const key = process.env.APOLLO_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch("https://api.apollo.io/v1/mixed_people/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": key,
      },
      body: JSON.stringify({
        q_organization_domains: domain,
        page: 1,
        per_page: 1,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.people?.[0]?.email ?? null;
  } catch {
    return null;
  }
}

export async function enrichLeads(
  inputs: EnrichInput[]
): Promise<EnrichResult[]> {
  const results: EnrichResult[] = [];

  for (const input of inputs) {
    const domain = input.domain ?? `${input.company.toLowerCase().replace(/\s+/g, "")}.com`;

    let email: string | null = null;
    let provider: string | null = null;

    email = await tryDropcontact(domain);
    if (email) {
      provider = "dropcontact";
    } else {
      await delay(500);
      email = await tryHunter(domain);
      if (email) {
        provider = "hunter";
      } else {
        await delay(500);
        email = await tryApollo(domain);
        if (email) provider = "apollo";
      }
    }

    results.push({ company: input.company, email, provider });
    await delay(1000);
  }

  return results;
}
