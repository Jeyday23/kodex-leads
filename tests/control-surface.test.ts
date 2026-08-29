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
  assert.match(route, /createLeadWorkPackages/);
  assert.match(route, /discoverEuDpaEnforcementLeads/);
});

test("public Authority pages are readable but mutation APIs require founder authorization", () => {
  const auth = read("lib/authority/auth.ts");
  const actions = read("app/admin/authority/AuthorityActions.tsx");
  assert.match(auth, /role:\s*"viewer"/);
  assert.match(auth, /Public staging read-only mode/);
  assert.match(auth, /x-kodex-control-secret/);
  assert.match(auth, /FOUNDER_CONTROL_REQUIRED/);
  assert.match(auth, /status:\s*403/);
  assert.match(actions, /x-kodex-control-secret/);
  assert.match(actions, /sessionStorage/);
  assert.match(actions, /response\.json/);
  assert.match(actions, /Could not reach the service/);
});

test("command controls are labeled and no longer use unexplained glyph buttons", () => {
  const command = read("app/admin/authority/command/page.tsx");
  assert.match(command, />Settings<\/a>/);
  assert.match(command, />Status<\/a>/);
  assert.match(command, /aria-label="Settings and integration readiness"/);
  assert.match(command, /aria-label="System status and observatory"/);
  assert.doesNotMatch(command, />⌕<\/a>/);
  assert.doesNotMatch(command, />○<\/a>/);
});

test("manual autonomy runs a non-publishing preflight before normal lead discovery", () => {
  const route = read("app/api/authority/autopilot/run/route.ts");
  const preflightIndex = route.indexOf("if (parsed.data.preflight)");
  const discoveryIndex = route.indexOf("await discoverKodexLeads()");
  assert.ok(preflightIndex >= 0);
  assert.ok(discoveryIndex > preflightIndex);
  assert.match(route, /runAutonomyPreflight/);
  assert.match(route, /createLeadWorkPackages/);
  assert.doesNotMatch(route, /controlledAcceptanceTest/);
});

test("preflight is explicitly non-publishing and checks required controls", () => {
  const preflight = read("lib/authority/preflight.ts");
  assert.match(preflight, /nonPublishing:\s*true/);
  assert.match(preflight, /AUTOPILOT_CONTROL_SECRET/);
  assert.match(preflight, /getProviderStatuses/);
  assert.match(preflight, /databaseConfigured/);
});

test("scheduled lead intelligence owns autonomous lead discovery and packaging", () => {
  const leadScript = read("scripts/run-lead-intelligence.ts");
  const authorityScript = read("scripts/run-authority-autopilot.ts");
  assert.match(leadScript, /discoverKodexLeads/);
  assert.match(leadScript, /discoverEuDpaEnforcementLeads/);
  assert.match(leadScript, /createLeadWorkPackages/);
  assert.match(leadScript, /LEAD_AUTOMATION_ENABLED/);
  assert.doesNotMatch(authorityScript, /discoverKodexLeads/);
  assert.match(authorityScript, /AUTOPILOT_SCHEDULE_ENABLED/);
  assert.match(authorityScript, /status\.databaseConfigured/);
  assert.match(authorityScript, /status\.mode === "off"/);
});

test("persistent monitoring worker uses the shared autonomy gate", () => {
  const worker = read("workers/monitoring-worker.ts");
  assert.match(worker, /skipScheduledAutonomy/);
});

test("private UI exposes non-publishing preflight and lead discovery controls", () => {
  const autopilot = read("app/admin/authority/AutopilotControl.tsx");
  const settings = read("app/admin/authority/settings/page.tsx");
  const legacySettings = read("app/admin/authority/settings/automation/page.tsx");
  const command = read("app/seo-command-center.tsx");
  assert.match(autopilot, /Run safety preflight/);
  assert.match(autopilot, /preflight:\s*true/);
  assert.match(autopilot, /Preflight is non-publishing/);
  assert.match(autopilot, /AUTOPILOT_CONTROL_SECRET/);
  assert.match(autopilot, /does not configure or save provider API keys/);
  assert.match(autopilot, /aria-pressed/);
  assert.match(autopilot, /Confirm run/);
  assert.match(settings, /Provider keys are not entered on this page/);
  assert.match(settings, /Configured/);
  assert.match(legacySettings, /redirect\("\/admin\/authority\/settings"\)/);
  assert.match(command, /Private control key/);
  assert.match(command, /x-kodex-control-secret/);
});

test("Render blueprint wires the master schedule gate to every authority background service", () => {
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

test("dedicated lead cron is enabled, staggered and has enrichment controls", () => {
  const render = read("render.yaml");
  const leadBlock = render.split(/\n(?=\s*- name:)/g).find((block) => /name:\s*kodex-lead-intelligence/.test(block));
  assert.ok(leadBlock, "Expected dedicated lead-intelligence cron");
  assert.match(leadBlock, /schedule:\s*"30 5 \* \* \*"/);
  assert.match(leadBlock, /LEAD_AUTOMATION_ENABLED/);
  assert.match(leadBlock, /value:\s*"true"/);
  assert.match(leadBlock, /LEAD_ENRICHMENT_MAX_PER_RUN/);
  assert.match(leadBlock, /LEAD_PACKAGE_MAX_PER_RUN/);
});

test("lead source credentials are declared for web and autonomous lead execution", () => {
  const render = read("render.yaml");
  for (const key of ["HUNTER_API_KEY", "APOLLO_API_KEY", "NORTHDATA_API_KEY", "LEAD_ENRICHMENT_MAX_PER_RUN"]) {
    const occurrences = render.match(new RegExp(key, "g"))?.length ?? 0;
    assert.ok(occurrences >= 3, `${key} should be available to web, worker and autonomous lead execution`);
  }
});

test("cross-run discovered leads are idempotent locally and in Supabase", () => {
  const localStore = read("lib/seo/local-store.ts");
  const migration = read("supabase/migrations/019_discovered_lead_dedupe.sql");
  assert.match(localStore, /discoveredLeadKey/);
  assert.match(localStore, /current\s*\?/);
  assert.match(migration, /lead_key text/);
  assert.match(migration, /unique \(lead_key\)/);
  assert.match(migration, /kodex_upsert_discovered_lead/);
  assert.match(migration, /before insert on public\.discovered_leads/);
});
