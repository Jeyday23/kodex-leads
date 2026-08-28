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

test("manual autonomy runs a non-publishing preflight before normal lead discovery", () => {
  const route = read("app/api/authority/autopilot/run/route.ts");
  const preflightIndex = route.indexOf("if (parsed.data.preflight)");
  const discoveryIndex = route.indexOf("await discoverKodexLeads()");
  assert.ok(preflightIndex >= 0);
  assert.ok(discoveryIndex > preflightIndex);
  assert.match(route, /runAutonomyPreflight/);
  assert.doesNotMatch(route, /controlledAcceptanceTest/);
});

test("preflight is explicitly non-publishing and checks required controls", () => {
  const preflight = read("lib/authority/preflight.ts");
  assert.match(preflight, /nonPublishing:\s*true/);
  assert.match(preflight, /AUTOPILOT_CONTROL_SECRET/);
  assert.match(preflight, /getProviderStatuses/);
  assert.match(preflight, /databaseConfigured/);
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

test("private UI exposes non-publishing preflight and lead discovery controls", () => {
  const autopilot = read("app/admin/authority/AutopilotControl.tsx");
  const command = read("app/seo-command-center.tsx");
  assert.match(autopilot, /Run safety preflight/);
  assert.match(autopilot, /preflight:\s*true/);
  assert.match(autopilot, /Preflight is non-publishing/);
  assert.match(command, /Private control key/);
  assert.match(command, /x-kodex-control-secret/);
});

test("Render blueprint wires the master schedule gate to every background execution service", () => {
  const render = read("render.yaml");
  const serviceBlocks = render.split(/\n(?=\s*- (?:type|name):)/g);
  const backgroundBlocks = serviceBlocks.filter((block) =>
    /type:\s*worker/.test(block) || (/name:\s*kodex-authority-/.test(block) && /schedule:/.test(block))
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
