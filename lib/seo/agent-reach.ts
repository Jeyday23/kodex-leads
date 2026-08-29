import "server-only";

import { access } from "node:fs/promises";
import path from "node:path";

export interface AgentReachStatus {
  installed: boolean;
  mode: "local-cli" | "upstream-fallback";
  binaryPath: string;
}

export interface AgentReachResearchResult {
  url: string;
  retrievedAt: string;
  provider: "agent-reach-jina";
  content: string;
}

const MAX_RESEARCH_CHARS = 30_000;

export function getAgentReachBinaryPath(): string {
  return path.join(process.cwd(), ".agent-reach-venv", "bin", "agent-reach");
}

export async function getAgentReachStatus(): Promise<AgentReachStatus> {
  const binaryPath = getAgentReachBinaryPath();
  try {
    await access(binaryPath);
    return { installed: true, mode: "local-cli", binaryPath };
  } catch {
    return { installed: false, mode: "upstream-fallback", binaryPath };
  }
}

export async function readWithAgentReach(urlInput: string): Promise<AgentReachResearchResult> {
  const url = validatePublicHttpUrl(urlInput);
  const jinaUrl = `https://r.jina.ai/${url.toString()}`;
  const response = await fetch(jinaUrl, {
    headers: {
      accept: "text/plain, text/markdown;q=0.9,*/*;q=0.1",
      "user-agent": "Kodex-Authority-AgentReach/1.0",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Agent-Reach upstream reader returned HTTP ${response.status}`);
  }

  const content = (await response.text()).trim();
  if (!content) throw new Error("Agent-Reach upstream reader returned an empty document");

  return {
    url: url.toString(),
    retrievedAt: new Date().toISOString(),
    provider: "agent-reach-jina",
    content: content.slice(0, MAX_RESEARCH_CHARS),
  };
}

function validatePublicHttpUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("A valid absolute URL is required");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only http and https URLs can be researched");
  }

  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname === "0.0.0.0" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error("Private or local network URLs are not allowed");
  }

  if (/^10\./.test(hostname) || /^192\.168\./.test(hostname) || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) {
    throw new Error("Private network URLs are not allowed");
  }

  return url;
}
