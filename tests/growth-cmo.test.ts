import test from "node:test";
import assert from "node:assert/strict";

for (const key of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "AWS_BEDROCK_ACCESS_KEY_ID",
  "AWS_BEDROCK_SECRET_ACCESS_KEY",
  "AWS_REGION",
  "BEDROCK_BALANCED_MODEL_ID",
  "ANTHROPIC_API_KEY",
  "CLAUDE_MODEL",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "MCP_ACCESS_TOKEN",
]) {
  delete process.env[key];
}

import { CMO_AGENT_MAX_ROUNDS, runCmoAgentTurn } from "../lib/growth/cmo/agent";
import { CMO_MUTATING_TOOL_NAMES, transitionCmoActionStatus } from "../lib/growth/cmo/actions";
import { proposeBrainUpdate, proposeChannelDraft, proposeSignalRun, proposeSiteAuditRun } from "../lib/growth/cmo/tools";
import { handleMcpRequest, listMcpToolNames } from "../lib/growth/mcp/server";

test("mutating CMO tools return proposals only", () => {
  const proposals = [
    proposeChannelDraft({ channel: "linkedin", topic: "EU AI Act evidence" }),
    proposeSiteAuditRun({ url: "https://kodex-compliance.com" }),
    proposeSignalRun({ signalType: "regulatory" }),
    proposeBrainUpdate({ summary: "Add a DPO persona" }),
  ];

  assert.deepEqual(CMO_MUTATING_TOOL_NAMES, [
    "propose_channel_draft",
    "propose_site_audit_run",
    "propose_signal_run",
    "propose_brain_update",
  ]);
  for (const proposal of proposals) {
    assert.equal(proposal.status, "proposed");
    assert.equal(proposal.executesImmediately, false);
    assert.match(proposal.actionType, /^propose_/);
  }
});

test("CMO action state machine only allows proposed actions to be decided", () => {
  assert.equal(transitionCmoActionStatus("proposed", "confirmed"), "confirmed");
  assert.equal(transitionCmoActionStatus("proposed", "rejected"), "rejected");
  assert.equal(transitionCmoActionStatus("confirmed", "executed"), "executed");
  assert.equal(transitionCmoActionStatus("confirmed", "failed"), "failed");
  assert.throws(() => transitionCmoActionStatus("confirmed", "rejected"), /cannot move/);
  assert.throws(() => transitionCmoActionStatus("rejected", "confirmed"), /Final CMO actions/);
  assert.throws(() => transitionCmoActionStatus("executed", "failed"), /Final CMO actions/);
});

test("CMO agent stays under max rounds and falls back deterministically without providers", async () => {
  const result = await runCmoAgentTurn({
    threadId: "00000000-0000-0000-0000-000000000001",
    content: "Draft a LinkedIn post about EU AI Act readiness.",
    actor: "test@example.com",
  });

  assert.ok(result.roundsUsed <= CMO_AGENT_MAX_ROUNDS);
  assert.equal(result.fallback, true);
  assert.ok(result.content.includes("proposal"));
  assert.equal(result.proposal?.status, "proposed");
  assert.equal(result.actions.length, 0);
});

test("MCP returns 503 when unset and 401 for a bad bearer token", async () => {
  const unset = await handleMcpRequest(new Request("https://example.com/api/mcp", { method: "POST", body: "{}" }));
  assert.equal(unset.status, 503);

  process.env.MCP_ACCESS_TOKEN = "good-token";
  const bad = await handleMcpRequest(new Request("https://example.com/api/mcp", {
    method: "POST",
    headers: { authorization: "Bearer wrong-token" },
    body: "{}",
  }));
  assert.equal(bad.status, 401);
});

test("MCP good auth exposes read-only tools and no mutating proposals", async () => {
  process.env.MCP_ACCESS_TOKEN = "good-token";
  const response = await handleMcpRequest(new Request("https://example.com/api/mcp", {
    method: "POST",
    headers: { authorization: "Bearer good-token" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
  }));
  assert.equal(response.status, 200);
  const body = await response.json() as { result: { tools: Array<{ name: string }> } };
  const names = body.result.tools.map((tool) => tool.name);

  assert.deepEqual(names, listMcpToolNames());
  assert.ok(names.includes("get_brain"));
  assert.ok(names.includes("search_knowledge"));
  assert.ok(!names.some((name) => name.startsWith("propose_")));
});
