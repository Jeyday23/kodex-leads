import "server-only";

export type AiProviderId = "openai" | "anthropic" | "perplexity";

export interface AiProviderStatus {
  id: AiProviderId;
  label: string;
  configured: boolean;
  missing: string[];
  endpoint: string;
}

export interface AiGenerationRequest {
  system: string;
  prompt: string;
  maxTokens?: number;
}

export interface AiGenerationResult {
  provider: AiProviderId;
  status: "generated" | "skipped" | "failed";
  text: string;
  model?: string;
  detail?: string;
}

export function getAiProviderStatuses(): AiProviderStatus[] {
  return [
    {
      id: "openai",
      label: "ChatGPT / OpenAI",
      configured: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL),
      missing: missing(["OPENAI_API_KEY", "OPENAI_MODEL"]),
      endpoint: "https://api.openai.com/v1/responses",
    },
    {
      id: "anthropic",
      label: "Claude / Anthropic",
      configured: Boolean(process.env.ANTHROPIC_API_KEY && process.env.CLAUDE_MODEL),
      missing: missing(["ANTHROPIC_API_KEY", "CLAUDE_MODEL"]),
      endpoint: "https://api.anthropic.com/v1/messages",
    },
    {
      id: "perplexity",
      label: "Perplexity",
      configured: Boolean(process.env.PERPLEXITY_API_KEY && process.env.PERPLEXITY_MODEL),
      missing: missing(["PERPLEXITY_API_KEY", "PERPLEXITY_MODEL"]),
      endpoint: "https://api.perplexity.ai/chat/completions",
    },
  ];
}

function missing(keys: string[]): string[] {
  return keys.filter((key) => !process.env[key]);
}

export async function generateWithConfiguredProviders(request: AiGenerationRequest): Promise<AiGenerationResult[]> {
  const results = await Promise.all([generateWithOpenAI(request), generateWithAnthropic(request), generateWithPerplexity(request)]);
  return results;
}

async function generateWithOpenAI(request: AiGenerationRequest): Promise<AiGenerationResult> {
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!key || !model) return skipped("openai", "Set OPENAI_API_KEY and OPENAI_MODEL.");

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions: request.system,
        input: request.prompt,
        max_output_tokens: request.maxTokens ?? 900,
      }),
    });
    const data = await response.json();
    if (!response.ok) return failed("openai", model, JSON.stringify(data));
    return { provider: "openai", status: "generated", model, text: extractOpenAIText(data) };
  } catch (error) {
    return failed("openai", model, error instanceof Error ? error.message : "Unknown OpenAI error.");
  }
}

async function generateWithAnthropic(request: AiGenerationRequest): Promise<AiGenerationResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  const model = process.env.CLAUDE_MODEL;
  if (!key || !model) return skipped("anthropic", "Set ANTHROPIC_API_KEY and CLAUDE_MODEL.");

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        system: request.system,
        messages: [{ role: "user", content: request.prompt }],
        max_tokens: request.maxTokens ?? 900,
      }),
    });
    const data = await response.json();
    if (!response.ok) return failed("anthropic", model, JSON.stringify(data));
    return { provider: "anthropic", status: "generated", model, text: extractAnthropicText(data) };
  } catch (error) {
    return failed("anthropic", model, error instanceof Error ? error.message : "Unknown Anthropic error.");
  }
}

async function generateWithPerplexity(request: AiGenerationRequest): Promise<AiGenerationResult> {
  const key = process.env.PERPLEXITY_API_KEY;
  const model = process.env.PERPLEXITY_MODEL;
  if (!key || !model) return skipped("perplexity", "Set PERPLEXITY_API_KEY and PERPLEXITY_MODEL.");

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
          { role: "system", content: request.system },
          { role: "user", content: request.prompt },
        ],
        max_tokens: request.maxTokens ?? 900,
      }),
    });
    const data = await response.json();
    if (!response.ok) return failed("perplexity", model, JSON.stringify(data));
    return { provider: "perplexity", status: "generated", model, text: String(data.choices?.[0]?.message?.content ?? "") };
  } catch (error) {
    return failed("perplexity", model, error instanceof Error ? error.message : "Unknown Perplexity error.");
  }
}

function skipped(provider: AiProviderId, detail: string): AiGenerationResult {
  return { provider, status: "skipped", text: "", detail };
}

function failed(provider: AiProviderId, model: string | undefined, detail: string): AiGenerationResult {
  return { provider, status: "failed", model, text: "", detail };
}

function extractOpenAIText(data: Record<string, unknown>): string {
  if (typeof data.output_text === "string") return data.output_text;
  const output = Array.isArray(data.output) ? data.output : [];
  return output
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const content = Array.isArray((item as Record<string, unknown>).content) ? ((item as Record<string, unknown>).content as unknown[]) : [];
      return content.map((block) => {
        if (!block || typeof block !== "object") return "";
        return String((block as Record<string, unknown>).text ?? "");
      });
    })
    .join("\n")
    .trim();
}

function extractAnthropicText(data: Record<string, unknown>): string {
  const content = Array.isArray(data.content) ? data.content : [];
  return content
    .map((block) => {
      if (!block || typeof block !== "object") return "";
      return String((block as Record<string, unknown>).text ?? "");
    })
    .join("\n")
    .trim();
}
