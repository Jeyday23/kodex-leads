import { delay } from "./types";

interface ContactResult {
  name: string;
  title: string;
  email: string | null;
  linkedin_url: string | null;
  source: "apollo" | "hunter";
}

const TARGET_TITLES = [
  "Data Protection Officer",
  "DPO",
  "Datenschutzbeauftragter",
  "Head of Legal",
  "General Counsel",
  "CTO",
  "VP Engineering",
  "Head of Engineering",
  "CEO",
  "Founder",
  "Geschaeftsfuehrer",
  "Managing Director",
];

async function searchApolloContacts(
  domain: string,
  companySize: string
): Promise<ContactResult[]> {
  const key = process.env.APOLLO_API_KEY;
  if (!key) return [];

  const titleFilter =
    companySize === "1-10" || companySize === "11-50"
      ? ["CEO", "Founder", "CTO", "DPO", "Head of Legal"]
      : ["DPO", "Head of Legal", "CTO", "VP Engineering", "General Counsel"];

  try {
    const res = await fetch("https://api.apollo.io/v1/mixed_people/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": key,
      },
      body: JSON.stringify({
        q_organization_domains: domain,
        person_titles: titleFilter,
        page: 1,
        per_page: 5,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return [];
    const data = await res.json();

    return (data.people ?? [])
      .filter((p: Record<string, unknown>) => {
        const title = String(p.title ?? "").toLowerCase();
        return TARGET_TITLES.some((t) => title.includes(t.toLowerCase()));
      })
      .map((p: Record<string, unknown>) => ({
        name: String(p.name ?? `${p.first_name ?? ""} ${p.last_name ?? ""}`).trim(),
        title: String(p.title ?? "Unknown"),
        email: (p.email as string) ?? null,
        linkedin_url: (p.linkedin_url as string) ?? null,
        source: "apollo" as const,
      }));
  } catch {
    return [];
  }
}

async function searchHunterContacts(domain: string): Promise<ContactResult[]> {
  const key = process.env.HUNTER_API_KEY;
  if (!key) return [];

  try {
    const res = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${key}&limit=5&type=personal`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!res.ok) return [];
    const data = await res.json();

    return (data.data?.emails ?? [])
      .filter((e: Record<string, unknown>) => {
        const pos = String(e.position ?? "").toLowerCase();
        return TARGET_TITLES.some((t) => pos.includes(t.toLowerCase()));
      })
      .map((e: Record<string, unknown>) => ({
        name: `${e.first_name ?? ""} ${e.last_name ?? ""}`.trim() || "Unknown",
        title: String(e.position ?? "Unknown"),
        email: String(e.value ?? ""),
        linkedin_url: (e.linkedin as string) ?? null,
        source: "hunter" as const,
      }));
  } catch {
    return [];
  }
}

export interface EnrichContactInput {
  lead_id: string;
  company: string;
  domain: string;
  team_size: string;
}

export interface EnrichedContact extends ContactResult {
  lead_id: string;
}

export async function enrichContacts(
  inputs: EnrichContactInput[]
): Promise<EnrichedContact[]> {
  const results: EnrichedContact[] = [];

  for (const input of inputs) {
    let contacts = await searchApolloContacts(input.domain, input.team_size);

    if (contacts.length === 0) {
      await delay(500);
      contacts = await searchHunterContacts(input.domain);
    }

    for (const contact of contacts) {
      results.push({ ...contact, lead_id: input.lead_id });
    }

    await delay(1000);
  }

  return results;
}
