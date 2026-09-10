// Shared LLM access for every Growth Engine module (Job 0 - shared foundation).
//
// Provider order: Bedrock (EU Claude) -> direct Anthropic -> OpenAI. The first
// configured provider is tried; if it throws or returns a non-OK HTTP status
// the request falls through to the next configured provider. No module under
// lib/growth/** may call a provider directly - everything goes through
// generateText()/generateJson() here so behaviour (fallback order, honesty
// about missing credentials, JSON extraction) stays in one place.
//
// This module must never import "server-only": scripts/ and workers/ import
// lib/growth/** modules directly under plain tsx, and tests/server-module-
// boundaries.test.ts enforces that those entry points never reach a
// server-only module.

import type { z } from "zod";
import { getBedrockConfig, bedrockMessage } from "@/lib/llm/bedrock";

export type GrowthLlmProviderId = "bedrock" | "anthropic" | "openai";

export interface GenerateTextRequest {
  system: string;
  prompt: string;
  maxTokens?: number;
}

export type GenerateTextStatus = "generated" | "skipped" | "failed";

export interface GenerateTextResult {
  status: GenerateTextStatus;
  text: string;
  provider: GrowthLlmProviderId | null;
  model: string | null;
  detail?: string;
}

export type GenerateJsonResult<T> =
  | { status: "generated"; value: T }
  | { status: "skipped" | "failed"; detail: string };

export interface GrowthLlmProviderStatus {
  id: GrowthLlmProviderId;
  label: string;
  configured: boolean;
  missing: string[];
}

export interface GrowthLlmStatus {
  providers: GrowthLlmProviderStatus[];
  configured: boolean;
  preferred: GrowthLlmProviderId | null;
}

const DEFAULT_MAX_TOKENS = 900;

function missingEnv(keys: string[]): string[] {
  return keys.filter((key) => !process.env[key]);
}

function isBedrockConfigured(): boolean {
  return getBedrockConfig() !== null;
}

function isAnthropicDirectConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY && process.env.CLAUDE_MODEL);
}

function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL);
}

/**
 * Reports each provider's configuration state so admin UI and the CMO chat
 * can say honestly which generators are live, without ever calling one.
 */
export function getGrowthLlmStatus(): GrowthLlmStatus {
  const providers: GrowthLlmProviderStatus[] = [
    {
      id: "bedrock",
      label: "Claude via Amazon Bedrock (EU)",
      configured: isBedrockConfigured(),
      missing: isBedrockConfigured()
        ? []
        : missingEnv(["AWS_BEDROCK_ACCESS_KEY_ID", "AWS_BEDROCK_SECRET_ACCESS_KEY", "AWS_REGION", "BEDROCK_BALANCED_MODEL_ID"]),
    },
    {
      id: "anthropic",
      label: "Claude / Anthropic (direct)",
      configured: isAnthropicDirectConfigured(),
      missing: isAnthropicDirectConfigured() ? [] : missingEnv(["ANTHROPIC_API_KEY", "CLAUDE_MODEL"]),
    },
    {
      id: "openai",
      label: "ChatGPT / OpenAI",
      configured: isOpenAiConfigured(),
      missing: isOpenAiConfigured() ? [] : missingEnv(["OPENAI_API_KEY", "OPENAI_MODEL"]),
    },
  ];

  const preferred = providers.find((provider) => provider.configured)?.id ?? null;

  return {
    providers,
    configured: providers.some((provider) => provider.configured),
    preferred,
  };
}

/**
 * Generates text using the first configured provider (Bedrock, then direct
 * Anthropic, then OpenAI). Falls through to the next configured provider on
 * failure. Returns `skipped` (never throws) when nothing is configured.
 */
export async function generateText(request: GenerateTextRequest): Promise<GenerateTextResult> {
  const attempts: Array<() => Promise<GenerateTextResult>> = [];

  if (isBedrockConfigured()) attempts.push(() => generateWithBedrock(request));
  if (isAnthropicDirectConfigured()) attempts.push(() => generateWithAnthropicDirect(request));
  if (isOpenAiConfigured()) attempts.push(() => generateWithOpenAi(request));

  if (attempts.length === 0) {
    return {
      status: "skipped",
      text: "",
      provider: null,
      model: null,
      detail:
        "No LLM provider configured. Set AWS_BEDROCK_ACCESS_KEY_ID/AWS_BEDROCK_SECRET_ACCESS_KEY/AWS_REGION/BEDROCK_BALANCED_MODEL_ID, or ANTHROPIC_API_KEY/CLAUDE_MODEL, or OPENAI_API_KEY/OPENAI_MODEL.",
    };
  }

  let lastFailure: GenerateTextResult | null = null;
  for (const attempt of attempts) {
    const result = await attempt();
    if (result.status === "generated") return result;
    lastFailure = result;
  }

  return (
    lastFailure ?? {
      status: "failed",
      text: "",
      provider: null,
      model: null,
      detail: "All configured providers failed.",
    }
  );
}

async function generateWithBedrock(request: GenerateTextRequest): Promise<GenerateTextResult> {
  const config = getBedrockConfig();
  if (!config) {
    return { status: "skipped", text: "", provider: "bedrock", model: null, detail: "Bedrock not configured." };
  }
  try {
    const data = await bedrockMessage(config, {
      system: request.system,
      prompt: request.prompt,
      maxTokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
    });
    return { status: "generated", text: extractAnthropicText(data), provider: "bedrock", model: config.model };
  } catch (error) {
    return {
      status: "failed",
      text: "",
      provider: "bedrock",
      model: config.model,
      detail: error instanceof Error ? error.message : "Unknown Bedrock error.",
    };
  }
}

async function generateWithAnthropicDirect(request: GenerateTextRequest): Promise<GenerateTextResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  const model = process.env.CLAUDE_MODEL;
  if (!key || !model) {
    return { status: "skipped", text: "", provider: "anthropic", model: null, detail: "Set ANTHROPIC_API_KEY and CLAUDE_MODEL." };
  }
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
        max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      return { status: "failed", text: "", provider: "anthropic", model, detail: JSON.stringify(data) };
    }
    return { status: "generated", text: extractAnthropicText(data), provider: "anthropic", model };
  } catch (error) {
    return {
      status: "failed",
      text: "",
      provider: "anthropic",
      model,
      detail: error instanceof Error ? error.message : "Unknown Anthropic error.",
    };
  }
}

async function generateWithOpenAi(request: GenerateTextRequest): Promise<GenerateTextResult> {
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!key || !model) {
    return { status: "skipped", text: "", provider: "openai", model: null, detail: "Set OPENAI_API_KEY and OPENAI_MODEL." };
  }
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
        max_output_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      return { status: "failed", text: "", provider: "openai", model, detail: JSON.stringify(data) };
    }
    return { status: "generated", text: extractOpenAiText(data), provider: "openai", model };
  } catch (error) {
    return {
      status: "failed",
      text: "",
      provider: "openai",
      model,
      detail: error instanceof Error ? error.message : "Unknown OpenAI error.",
    };
  }
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

function extractOpenAiText(data: Record<string, unknown>): string {
  if (typeof data.output_text === "string") return data.output_text;
  const output = Array.isArray(data.output) ? data.output : [];
  return output
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const content = Array.isArray((item as Record<string, unknown>).content)
        ? ((item as Record<string, unknown>).content as unknown[])
        : [];
      return content.map((block) => {
        if (!block || typeof block !== "object") return "";
        return String((block as Record<string, unknown>).text ?? "");
      });
    })
    .join("\n")
    .trim();
}

/**
 * Pulls the first JSON object or array out of free-form model text, tolerating
 * a leading ```json fence and leading prose before the JSON begins.
 */
function extractFirstJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;

  const trimmed = candidate.trim();
  const start = trimmed.search(/[[{]/);
  if (start === -1) throw new Error("No JSON object or array found in model output.");

  const opener = trimmed[start];
  const closer = opener === "{" ? "}" : "]";

  let depth = 0;
  let end = -1;
  for (let i = start; i < trimmed.length; i += 1) {
    const char = trimmed[i];
    if (char === opener) depth += 1;
    else if (char === closer) {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) throw new Error("Unbalanced JSON in model output.");

  return JSON.parse(trimmed.slice(start, end + 1));
}

/**
 * Generates text, extracts the first JSON value from it, and validates it
 * against `schema`. Never throws: malformed or schema-invalid output is
 * reported as a `failed` result with a human-readable detail.
 */
export async function generateJson<Schema extends z.ZodTypeAny>(
  request: GenerateTextRequest,
  schema: Schema,
): Promise<GenerateJsonResult<z.infer<Schema>>> {
  const textResult = await generateText(request);

  if (textResult.status === "skipped") {
    return { status: "skipped", detail: textResult.detail ?? "No LLM provider configured." };
  }
  if (textResult.status === "failed") {
    return { status: "failed", detail: textResult.detail ?? "LLM generation failed." };
  }

  let parsed: unknown;
  try {
    parsed = extractFirstJson(textResult.text);
  } catch (error) {
    return { status: "failed", detail: error instanceof Error ? error.message : "Could not parse JSON from model output." };
  }

  const validation = schema.safeParse(parsed);
  if (!validation.success) {
    return { status: "failed", detail: `Model output failed schema validation: ${validation.error.message}` };
  }

  return { status: "generated", value: validation.data };
}
