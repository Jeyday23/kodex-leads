import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

test("direct lead discovery requires an authenticated admin or Render cron", () => {
  const route = read("app/api/leads/discover/route.ts");
  assert.match(route, /requireAuthorityApi\(request,\s*\{\s*allowCron:\s*true\s*\}\)/);
  assert.match(route, /if \(!auth\.ok\) return auth\.response/);
  assert.doesNotMatch(route, /x-kodex-control-secret/);
  assert.doesNotMatch(route, /AUTOPILOT_CONTROL_SECRET/);
  assert.match(route, /createLeadWorkPackages/);
  assert.match(route, /discoverEuDpaEnforcementLeads/);
});

test("every admin surface is private and fails closed", () => {
  const auth = read("lib/authority/auth.ts");
  const actions = read("app/admin/authority/AuthorityActions.tsx");
  const middleware = read("proxy.ts");
  const adminLayout = read("app/admin/layout.tsx");

  // No anonymous viewer fallback may exist. This is the regression that made
  // /admin/leads and Founder Ops publicly readable.
  assert.doesNotMatch(auth, /publicStagingViewer/);
  assert.doesNotMatch(auth, /role:\s*"viewer"/);
  assert.doesNotMatch(auth, /Public staging read-only mode/);

  // The page guard redirects rather than returning a usable fallback user.
  assert.match(auth, /redirect\(`\/auth\/login\?/);
  // Role comes from the profiles table, never from client-writable metadata.
  assert.doesNotMatch(auth, /user_metadata\?\.role/);
  // Token is revalidated with Supabase, not trusted from the cookie.
  assert.match(auth, /supabase\.auth\.getUser\(\)/);

  // Middleware gates /admin and fails closed when Supabase is unconfigured.
  assert.match(middleware, /PROTECTED_PREFIXES\s*=\s*\["\/admin"\]/);
  assert.match(middleware, /if \(!config\)/);
  assert.match(middleware, /loginRedirect\(request, "auth-unavailable"\)/);
  assert.match(middleware, /getUser\(\)/);
  assert.doesNotMatch(middleware, /auth\.getSession\(\)/);

  // The layout enforces the admin role on every /admin/* page.
  assert.match(adminLayout, /requireAuthorityPage/);

  // The browser never handles a shared secret.
  assert.doesNotMatch(actions, /x-kodex-control-secret/);
  assert.doesNotMatch(actions, /sessionStorage/);
  assert.match(actions, /credentials:\s*"same-origin"/);
});

test("no shared secret is ever entered in or sent from the browser", () => {
  const clientFiles = [
    "app/admin/authority/AutopilotControl.tsx",
    "app/admin/authority/AuthorityActions.tsx",
    "app/admin/authority/outreach/ApprovalQueue.tsx",
    "app/admin/authority/media/MediaActions.tsx",
    "app/seo-command-center.tsx",
    "app/admin/authority/settings/page.tsx",
  ];
  for (const file of clientFiles) {
    const source = read(file);
    assert.doesNotMatch(source, /x-kodex-control-secret/, `${file} still sends the shared control secret`);
    assert.doesNotMatch(source, /AUTOPILOT_CONTROL_SECRET/, `${file} still references the shared control secret`);
    assert.doesNotMatch(source, /CRON_SECRET/, `${file} must never expose CRON_SECRET to the browser`);
  }
});

test("CRON_SECRET authenticates server automation only", () => {
  const auth = read("lib/authority/auth.ts");
  assert.match(auth, /isCronRequest/);
  assert.match(auth, /options\.allowCron && isCronRequest\(request\)/);
  // Compared in constant time so the secret cannot be recovered byte by byte.
  assert.match(auth, /timingSafeEqual/);
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
  assert.doesNotMatch(preflight, /AUTOPILOT_CONTROL_SECRET/);
  assert.match(preflight, /admin-authentication/);
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
  assert.doesNotMatch(autopilot, /AUTOPILOT_CONTROL_SECRET/);
  assert.match(autopilot, /aria-pressed/);
  assert.match(autopilot, /Confirm run/);
  assert.match(settings, /Provider keys are not entered on this page/);
  assert.match(settings, /Configured/);
  assert.match(legacySettings, /redirect\("\/admin\/authority\/settings"\)/);
  assert.doesNotMatch(command, /Private control key/);
  assert.doesNotMatch(command, /x-kodex-control-secret/);
  assert.match(command, /credentials:\s*"same-origin"/);
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

test("each environment has its own dedicated, staggered lead cron", () => {
  const render = read("render.yaml");
  for (const [environment, branch, enabled] of [["staging", "staging", '"true"'], ["production", "main", '"false"']]) {
    const block = render
      .split(/\n(?=\s*- name:)/g)
      .find((candidate) => new RegExp(`name:\\s*kodex-lead-intelligence-${environment}`).test(candidate));
    assert.ok(block, `Expected a lead-intelligence cron for ${environment}`);
    assert.match(block, /schedule:\s*"30 5 \* \* \*"/);
    assert.match(block, new RegExp(`branch:\\s*${branch}`));
    assert.match(block, /LEAD_AUTOMATION_ENABLED/);
    // Autonomy must never default on for an environment that has never run.
    assert.match(block, new RegExp(`value:\\s*${enabled}`));
    // Enrichment budgets reach the job through its environment's integrations group.
    assert.match(block, new RegExp(`kodex-leads-${environment}-integrations`));
  }
});

test("lead source credentials are scoped per environment and never inlined", () => {
  const render = read("render.yaml");
  const groups = render.split(/\n(?=\s{2}- name:)/g);
  for (const environment of ["staging", "production"]) {
    const integrations = groups.find((block) =>
      new RegExp(`name:\\s*kodex-leads-${environment}-integrations`).test(block));
    assert.ok(integrations, `Expected an integrations env group for ${environment}`);
    for (const key of ["HUNTER_API_KEY", "APOLLO_API_KEY", "NORTHDATA_API_KEY", "LEAD_ENRICHMENT_MAX_PER_RUN", "LEAD_PACKAGE_MAX_PER_RUN"]) {
      assert.match(integrations, new RegExp(key), `${key} missing from ${environment} integrations group`);
    }
  }
});

test("staging and production never share an environment group", () => {
  const render = read("render.yaml");
  const blocks = render.split(/\n(?=\s*- (?:type|name):)/g);
  for (const block of blocks) {
    const branch = block.match(/branch:\s*(\S+)/)?.[1];
    if (!branch) continue;
    const environment = branch === "main" ? "production" : "staging";
    const foreign = branch === "main" ? "staging" : "production";
    const groups = block.match(/kodex-leads-\S+/g) ?? [];
    for (const group of groups) {
      assert.ok(
        !group.includes(foreign),
        `A ${environment} service (branch ${branch}) references the ${foreign} env group ${group}`,
      );
    }
  }
});

test("the shared browser control secret is gone from configuration", () => {
  // AUTOPILOT_CONTROL_SECRET authorized privileged actions from a value pasted
  // into the browser. Nothing reads it any more, so it must not be provisioned.
  for (const file of ["render.yaml", ".env.example"]) {
    assert.doesNotMatch(read(file), /AUTOPILOT_CONTROL_SECRET/, `${file} still provisions the removed shared secret`);
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
