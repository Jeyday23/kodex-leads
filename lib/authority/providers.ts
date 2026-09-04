import type { AuthorityProviderId, MonitoringProvider, MonitoringProviderInput, MonitoringProviderResult } from "./types";
import { getBedrockConfig, bedrockMessage } from "@/lib/llm/bedrock";

export function getAuthorityProviders(): MonitoringProvider[] {
  return [
    createOpenAIProvider(),
    createAnthropicProvider(),
    createPerplexityProvider(),
  ];
}

export function getProviderStatuses() {
  return getAuthorityProviders().map(({ name, label, configured, missing }) => ({ name, label, configured, missing }));
}

function createOpenAIProvider(): MonitoringProvider {
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  return {
    name: "openai",
    label: "ChatGPT / OpenAI",
    configured: Boolean(key && model),
    missing: missing(["OPENAI_API_KEY", "OPENAI_MODEL"]),
    async execute(input) {
      if (!key || !model) return skippedResult("openai", "OPENAI_MODEL");
      const started = Date.now();
      const response = await fetchWithRetry("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({
          model,
          instructions: systemPrompt(input),
          input: input.prompt,
          max_output_tokens: 900,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(`OpenAI ${response.status}: ${JSON.stringify(data)}`);
      return {
        answer: extractOpenAIText(data),
        citations: [],
        model,
        rawResponse: data,
        latencyMs: Date.now() - started,
      };
    },
  };
}

function createAnthropicProvider(): MonitoringProvider {
  const bedrock = getBedrockConfig();
  const key = process.env.ANTHROPIC_API_KEY;
  const model = bedrock ? bedrock.model : process.env.CLAUDE_MODEL;
  return {
    name: "anthropic",
    label: bedrock ? "Claude / Bedrock (EU)" : "Claude / Anthropic",
    configured: Boolean(bedrock) || Boolean(key && model),
    missing: bedrock ? [] : missing(["ANTHROPIC_API_KEY", "CLAUDE_MODEL"]),
    async execute(input) {
      const started = Date.now();
      if (bedrock) {
        const data = await bedrockMessage(bedrock, {
          system: systemPrompt(input),
          prompt: input.prompt,
          maxTokens: 900,
        });
        return {
          answer: extractAnthropicText(data),
          citations: [],
          model: bedrock.model,
          rawResponse: data,
          latencyMs: Date.now() - started,
        };
      }
      if (!key || !model) return skippedResult("anthropic", "CLAUDE_MODEL");
      const response = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          system: systemPrompt(input),
          messages: [{ role: "user", content: input.prompt }],
          max_tokens: 900,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(`Anthropic ${response.status}: ${JSON.stringify(data)}`);
      return {
        answer: extractAnthropicText(data),
        citations: [],
        model,
        rawResponse: data,
        latencyMs: Date.now() - started,
      };
    },
  };
}

function createPerplexityProvider(): MonitoringProvider {
  const key = process.env.PERPLEXITY_API_KEY;
  const model = process.env.PERPLEXITY_MODEL;
  return {
    name: "perplexity",
    label: "Perplexity",
    configured: Boolean(key && model),
    missing: missing(["PERPLEXITY_API_KEY", "PERPLEXITY_MODEL"]),
    async execute(input) {
      if (!key || !model) return skippedResult("perplexity", "PERPLEXITY_MODEL");
      const started = Date.now();
      const response = await fetchWithRetry("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt(input) },
            { role: "user", content: input.prompt },
          ],
          max_tokens: 900,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(`Perplexity ${response.status}: ${JSON.stringify(data)}`);
      return {
        answer: String(data.choices?.[0]?.message?.content ?? ""),
        citations: normalizePerplexityCitations(data),
        model,
        rawResponse: data,
        latencyMs: Date.now() - started,
      };
    },
  };
}

function systemPrompt(input: MonitoringProviderInput): string {
  return [
    "You are running citation monitoring for Kodex.",
    "Answer normally, include source URLs when available, and do not invent citations.",
    `Country: ${input.country ?? "US"}. Language: ${input.language ?? "en"}.`,
  ].join(" ");
}

function missing(keys: string[]): string[] {
  return keys.filter((key) => !process.env[key]);
}

function skippedResult(provider: AuthorityProviderId, modelName: string): MonitoringProviderResult {
  return {
    answer: "",
    citations: [],
    model: process.env[modelName] ?? "not-configured",
    rawResponse: { skipped: true, provider },
    latencyMs: 0,
  };
}

function extractOpenAIText(data: Record<string, unknown>): string {
  if (typeof data.output_text === "string") return data.output_text;
  const output = Array.isArray(data.output) ? data.output : [];
  return output.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const content = Array.isArray((item as Record<string, unknown>).content) ? (item as Record<string, unknown>).content as unknown[] : [];
    return content.map((block) => typeof block === "object" && block ? String((block as Record<string, unknown>).text ?? "") : "");
  }).join("\n").trim();
}

function extractAnthropicText(data: Record<string, unknown>): string {
  const content = Array.isArray(data.content) ? data.content : [];
  return content.map((block) => typeof block === "object" && block ? String((block as Record<string, unknown>).text ?? "") : "").join("\n").trim();
}

function normalizePerplexityCitations(data: Record<string, unknown>) {
  const citations = Array.isArray(data.citations) ? data.citations : [];
  return citations.flatMap((citation) => typeof citation === "string" ? [{ url: citation }] : []);
}

async function fetchWithRetry(url: string, init: RequestInit, retries = 2): Promise<Response> {
  let lastResponse: Response | null = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch(url, init);
    if (![429, 500, 502, 503, 504].includes(response.status)) return response;
    lastResponse = response;
    await delay(400 * (attempt + 1));
  }
  return lastResponse ?? fetch(url, init);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
