import { getMcpBrainTools, searchKnowledge } from "@/lib/growth/cmo/tools";
import type { GrowthChannel } from "@/lib/growth/context";

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

const READ_ONLY_TOOL_NAMES = [
  "get_brain",
  "list_personas",
  "list_keywords",
  "list_message_pillars",
  "list_competitors",
  "get_channel_voice",
  "search_knowledge",
] as const;

export function listMcpToolNames(): string[] {
  return [...READ_ONLY_TOOL_NAMES];
}

function jsonRpc(id: JsonRpcRequest["id"], result: unknown, status = 200) {
  return Response.json({ jsonrpc: "2.0", id: id ?? null, result }, { status });
}

function jsonRpcError(id: JsonRpcRequest["id"], code: number, message: string, status = 200) {
  return Response.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } }, { status });
}

function constantTimeEqual(a: string, b: string): boolean {
  const max = Math.max(a.length, b.length);
  let mismatch = a.length ^ b.length;
  for (let index = 0; index < max; index += 1) {
    mismatch |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}

export function authorizeMcpRequest(request: Request): { ok: true } | { ok: false; response: Response } {
  const token = process.env.MCP_ACCESS_TOKEN;
  if (!token) return { ok: false, response: Response.json({ error: "MCP_ACCESS_TOKEN is not configured." }, { status: 503 }) };

  const header = request.headers.get("authorization") ?? "";
  const prefix = "Bearer ";
  const presented = header.startsWith(prefix) ? header.slice(prefix.length) : "";
  if (!constantTimeEqual(presented, token)) {
    return { ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { ok: true };
}

function toolDescriptors() {
  return READ_ONLY_TOOL_NAMES.map((name) => ({
    name,
    description: `Read-only Kodex Growth tool: ${name}.`,
    inputSchema: {
      type: "object",
      properties:
        name === "get_channel_voice"
          ? { channel: { type: "string", enum: ["linkedin", "x", "reddit", "articles", "email"] } }
          : name === "search_knowledge"
            ? { query: { type: "string" } }
            : {},
      additionalProperties: false,
    },
  }));
}

async function callReadOnlyTool(name: string, args: Record<string, unknown>) {
  const brainTools = await getMcpBrainTools();
  switch (name) {
    case "get_brain":
      return brainTools.get_brain();
    case "list_personas":
      return brainTools.list_personas();
    case "list_keywords":
      return brainTools.list_keywords();
    case "list_message_pillars":
      return brainTools.list_message_pillars();
    case "list_competitors":
      return brainTools.list_competitors();
    case "get_channel_voice":
      return brainTools.get_channel_voice((args.channel as GrowthChannel | undefined) ?? "linkedin");
    case "search_knowledge":
      return searchKnowledge(String(args.query ?? ""));
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export async function handleMcpRequest(request: Request): Promise<Response> {
  const auth = authorizeMcpRequest(request);
  if (!auth.ok) return auth.response;

  let body: JsonRpcRequest;
  try {
    body = (await request.json()) as JsonRpcRequest;
  } catch {
    return jsonRpcError(null, -32700, "Invalid JSON");
  }

  const id = body.id ?? null;
  switch (body.method) {
    case "initialize":
      return jsonRpc(id, {
        protocolVersion: "2024-11-05",
        serverInfo: { name: "kodex-growth-cmo", version: "0.1.0" },
        capabilities: { tools: {} },
      });
    case "ping":
      return jsonRpc(id, {});
    case "tools/list":
      return jsonRpc(id, { tools: toolDescriptors() });
    case "tools/call": {
      const params = body.params ?? {};
      const name = String(params.name ?? "");
      const args = (params.arguments as Record<string, unknown> | undefined) ?? {};
      if (!READ_ONLY_TOOL_NAMES.includes(name as (typeof READ_ONLY_TOOL_NAMES)[number])) {
        return jsonRpcError(id, -32602, "Tool is not available.");
      }
      const result = await callReadOnlyTool(name, args);
      return jsonRpc(id, {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        isError: false,
      });
    }
    default:
      return jsonRpcError(id, -32601, "Method not found");
  }
}
