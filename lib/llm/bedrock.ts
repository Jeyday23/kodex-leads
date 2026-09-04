// Claude inference via Amazon Bedrock.
//
// Uses a Bedrock-scoped IAM pair (AWS_BEDROCK_*), kept deliberately separate
// from the general AWS IAM pair so the two credentials are never conflated.
// The SDK signs requests with SigV4; AWS_REGION pins inference to the EU, and
// BEDROCK_BALANCED_MODEL_ID holds the EU cross-region inference profile id.
//
// When these are unset the callers fall back to the direct Anthropic API.

export type BedrockConfig = {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  model: string;
};

export function getBedrockConfig(): BedrockConfig | null {
  const accessKeyId = process.env.AWS_BEDROCK_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_BEDROCK_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION;
  const model = process.env.BEDROCK_BALANCED_MODEL_ID;
  if (!accessKeyId || !secretAccessKey || !region || !model) return null;
  return { accessKeyId, secretAccessKey, region, model };
}

export async function bedrockMessage(
  config: BedrockConfig,
  params: { system?: string; prompt: string; maxTokens?: number },
): Promise<Record<string, unknown>> {
  const { default: AnthropicBedrock } = await import("@anthropic-ai/bedrock-sdk");
  const client = new AnthropicBedrock({
    awsAccessKey: config.accessKeyId,
    awsSecretKey: config.secretAccessKey,
    awsRegion: config.region,
  });
  const response = await client.messages.create({
    model: config.model,
    system: params.system,
    messages: [{ role: "user", content: params.prompt }],
    max_tokens: params.maxTokens ?? 900,
  });
  // Same {content:[{type,text}]} shape the direct API returns, so the existing
  // extractAnthropicText helpers work unchanged.
  return response as unknown as Record<string, unknown>;
}
