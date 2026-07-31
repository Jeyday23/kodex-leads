import "server-only";
import { storeAuditEventLocally, storeDiscoveredLeadsLocally, type DiscoveredLead } from "./local-store";

export interface LeadDiscoveryResult {
  mode: "live" | "local-test";
  searchedAt: string;
  query: string;
  leads: DiscoveredLead[];
  nextActions: string[];
}

const localCandidates: Omit<DiscoveredLead, "id" | "createdAt">[] = [
  {
    companyName: "AI Workflow SaaS Teams",
    website: "https://example.com/ai-workflow",
    segment: "B2B SaaS",
    fitReason: "Likely needs answer-engine visibility for problem-aware buyers comparing AI workflow platforms.",
    suggestedSearchIntent: "llm visibility for b2b saas",
    suggestedLandingPage: "/learn/seo/llm-discovery",
    confidence: 78,
    source: "local-test",
  },
  {
    companyName: "Vertical Software Operators",
    website: "https://example.com/vertical-software",
    segment: "Vertical SaaS",
    fitReason: "Often has narrow high-intent queries where structured pages and LLM-ready citations can win qualified traffic.",
    suggestedSearchIntent: "seo automation for vertical saas",
    suggestedLandingPage: "/compare/google-vs-llm-search",
    confidence: 74,
    source: "local-test",
  },
  {
    companyName: "Founder-led Service Firms",
    website: "https://example.com/service-firm",
    segment: "Expert services",
    fitReason: "Can convert educational traffic into assessments and sales calls with a lean SEO operating loop.",
    suggestedSearchIntent: "automated seo lead generation process",
    suggestedLandingPage: "/deadlines/seo",
    confidence: 70,
    source: "local-test",
  },
];

export async function discoverKodexLeads(): Promise<LeadDiscoveryResult> {
  const query = "companies likely to need SEO and LLM discovery automation for qualified B2B lead generation";
  const live = await discoverWithPerplexity(query);
  const mode = live.length > 0 ? "live" : "local-test";
  const stored = await storeDiscoveredLeadsLocally(live.length > 0 ? live : localCandidates);

  await storeAuditEventLocally({
    eventType: "lead_discovery_completed",
    payload: {
      mode,
      query,
      discovered: stored.length,
      sources: [...new Set(stored.map((lead) => lead.source))],
    },
  });

  return {
    mode,
    searchedAt: new Date().toISOString(),
    query,
    leads: stored,
    nextActions: [
      "Review discovered leads in /admin/leads.",
      "Create landing pages for repeated search intents.",
      "Route qualified matches into outreach only after human approval or configured CRM workflow.",
    ],
  };
}

async function discoverWithPerplexity(query: string): Promise<Omit<DiscoveredLead, "id" | "createdAt">[]> {
  const key = process.env.PERPLEXITY_API_KEY;
  const model = process.env.PERPLEXITY_MODEL;
  if (!key || !model) return [];

  const prompt = [
    "Find 5 B2B companies or company categories that are plausible prospects for SEO and LLM discovery automation.",
    "Return strict JSON array only. Fields: companyName, website, segment, fitReason, suggestedSearchIntent, suggestedLandingPage, confidence.",
    "Use suggestedLandingPage from: /learn/seo/llm-discovery, /compare/google-vs-llm-search, /deadlines/seo, /assess/seo.",
    `Query: ${query}`,
  ].join("\n");

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You produce concise JSON for B2B lead discovery. Do not include markdown." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!response.ok) return [];
    const data = await response.json();
    const text = String(data.choices?.[0]?.message?.content ?? "[]");
    const parsed = JSON.parse(text) as Array<Record<string, unknown>>;
    return parsed.slice(0, 8).map((lead) => ({
      companyName: String(lead.companyName ?? "Unknown prospect"),
      website: String(lead.website ?? ""),
      segment: String(lead.segment ?? "B2B"),
      fitReason: String(lead.fitReason ?? "Potential fit for SEO and LLM discovery automation."),
      suggestedSearchIntent: String(lead.suggestedSearchIntent ?? query),
      suggestedLandingPage: String(lead.suggestedLandingPage ?? "/assess/seo"),
      confidence: Number(lead.confidence ?? 65),
      source: "perplexity",
    }));
  } catch {
    return [];
  }
}
