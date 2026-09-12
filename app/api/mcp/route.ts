import { handleMcpRequest } from "@/lib/growth/mcp/server";

export async function POST(request: Request) {
  return handleMcpRequest(request);
}
