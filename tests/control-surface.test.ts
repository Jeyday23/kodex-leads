import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

test("direct lead discovery requires a private control or cron secret", () => {
  const route = read("app/api/leads/discover/route.ts");
  assert.match(route, /AUTOPILOT_CONTROL_SECRET/);
  assert.match(route, /x-kodex-control-secret/);
  assert.match(route, /CRON_SECRET/);
  assert.match(route, /status:\s*403/);
});

test("manual autonomy includes lead discovery but acceptance test does not", () => {
  const route = read("app/api/authority/autopilot/run/route.ts");
  const acceptanceIndex = route.indexOf("if (parsed.data.acceptance)");
  const discoveryIndex = route.indexOf("await discoverKodexLeads()");
  assert.ok(acceptanceIndex >= 0);
  assert.ok(discoveryIndex > acceptanceIndex);
  assert.match(route, /controlledAcceptanceTest/);
});

test("scheduled autopilot includes lead discovery and respects master enable flag", () => {
  const script = read("scripts/run-authority-autopilot.ts");
  assert.match(script, /AUTOPILOT_SCHEDULE_ENABLED/);
  assert.match(script, /status\.databaseConfigured/);
  assert.match(script, /status\.mode === "off"/);
  assert.match(script, /discoverKodexLeads/);
});

test("persistent monitoring worker uses the shared autonomy gate", () => {
  const worker = read("workers/monitoring-worker.ts");
  assert.match(worker, /skipScheduledAutonomy/);
});

test("private UI exposes safety test and lead discovery controls", () => {
  const autopilot = read("app/admin/authority/AutopilotControl.tsx");
  const command = read("app/seo-command-center.tsx");
  assert.match(autopilot, /Run safety test/);
  assert.match(autopilot, /acceptance:\s*true/);
  assert.match(command, /Private control key/);
  assert.match(command, /x-kodex-control-secret/);
});

test("Render blueprint wires the master schedule gate to every background execution service", () => {
  const render = read("render.yaml");
  const serviceBlocks = render.split(/\n(?=\s*- (?:type|name):)/g);
  const backgroundBlocks = serviceBlocks.filter((block) =>
    /type:\s*worker/.test(block) || /name:\s*kodex-authority-/.test(block) && /schedule:/.test(block)
  );
  assert.ok(backgroundBlocks.length >= 10, "Expected workers and cron jobs in Render blueprint");
  for (const block of backgroundBlocks) {
    assert.match(block, /AUTOPILOT_SCHEDULE_ENABLED/, `Missing schedule gate in block: ${block.slice(0, 100)}`);
  }
});

test("lead source credentials are declared for web and autonomous lead execution", () => {
  const render = read("render.yaml");
  for (const key of ["HUNTER_API_KEY", "APOLLO_API_KEY", "NORTHDATA_API_KEY", "LEAD_ENRICHMENT_MAX_PER_RUN"]) {
    const occurrences = render.match(new RegExp(key, "g"))?.length ?? 0;
    assert.ok(occurrences >= 3, `${key} should be available to web, worker and autonomous planning cron`);
  }
});
