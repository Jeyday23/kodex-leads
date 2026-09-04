import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveStoredAutopilotSettings } from "../lib/authority/autonomous-ranking-policy";
import { skipScheduledAutonomy } from "../scripts/scheduled-autonomy-gate";

function withScheduleFlag(value: string | undefined, run: () => Promise<void>) {
  const previous = process.env.AUTOPILOT_SCHEDULE_ENABLED;
  const previousLog = console.log;
  const logs: string[] = [];
  console.log = (...args: unknown[]) => logs.push(args.map(String).join(" "));
  if (value === undefined) delete process.env.AUTOPILOT_SCHEDULE_ENABLED;
  else process.env.AUTOPILOT_SCHEDULE_ENABLED = value;
  return run().finally(() => {
    console.log = previousLog;
    if (previous === undefined) delete process.env.AUTOPILOT_SCHEDULE_ENABLED;
    else process.env.AUTOPILOT_SCHEDULE_ENABLED = previous;
  }).then(() => logs);
}

test("an empty settings table reports the database as unavailable", () => {
  const resolved = resolveStoredAutopilotSettings(null, null);
  assert.equal(resolved.databaseConfigured, false);
  assert.match(String(resolved.databaseError), /no 'global' row/);
});

test("a stored row is reported as configured with its own mode and limits", () => {
  const resolved = resolveStoredAutopilotSettings({
    mode: "guarded",
    max_new_pages_per_day: 5,
    max_revisions_per_day: 12,
    pilot_completed: true,
    changed_at: "2026-09-04T06:00:00.000Z",
  }, null);
  assert.equal(resolved.databaseConfigured, true);
  assert.equal(resolved.mode, "guarded");
  assert.equal(resolved.maxNewPagesPerDay, 5);
  assert.equal(resolved.maxRevisionsPerDay, 12);
  assert.equal(resolved.pilotCompleted, true);
});

test("a read error fails closed and surfaces the Postgres message", () => {
  const resolved = resolveStoredAutopilotSettings(null, { message: "permission denied for table" });
  assert.equal(resolved.databaseConfigured, false);
  assert.match(String(resolved.databaseError), /permission denied for table/);
});

test("empty settings make scheduled jobs skip even when the env flag is true", async () => {
  const logs = await withScheduleFlag("true", async () => {
    const shouldSkip = await skipScheduledAutonomy("test-service", async () =>
      resolveStoredAutopilotSettings(null, null));
    assert.equal(shouldSkip, true);
  });
  assert.equal(logs.some((line) => line.includes("Autonomy settings database is unavailable")), true);
});

test("mode off makes scheduled jobs skip even when the env flag is true", async () => {
  const logs = await withScheduleFlag("true", async () => {
    const shouldSkip = await skipScheduledAutonomy("test-service", async () =>
      resolveStoredAutopilotSettings({ mode: "off" }, null));
    assert.equal(shouldSkip, true);
  });
  assert.equal(logs.some((line) => line.includes("Autopilot mode is off")), true);
});

test("a stored non-off mode allows execution when the env flag is true", async () => {
  for (const mode of ["draft_only", "guarded", "controlled"]) {
    await withScheduleFlag("true", async () => {
      const shouldSkip = await skipScheduledAutonomy("test-service", async () =>
        resolveStoredAutopilotSettings({ mode }, null));
      assert.equal(shouldSkip, false, `${mode} should be allowed to run`);
    });
  }
});

test("a stored non-off mode is still blocked when the env flag is not true", async () => {
  const logs = await withScheduleFlag("false", async () => {
    const shouldSkip = await skipScheduledAutonomy("test-service", async () =>
      resolveStoredAutopilotSettings({ mode: "controlled" }, null));
    assert.equal(shouldSkip, true);
  });
  assert.equal(logs.some((line) => line.includes("AUTOPILOT_SCHEDULE_ENABLED is not true")), true);
});

test("the autopilot status route guards both GET and PATCH with the admin check", () => {
  const route = readFileSync("app/api/authority/autopilot/status/route.ts", "utf8");
  // Every exported handler must take the auth guard before touching the store,
  // and neither may opt into the CRON_SECRET bypass: mode changes are a human
  // administrator action only.
  const handlers = route.split(/export async function /).slice(1);
  assert.equal(handlers.length, 2);
  for (const handler of handlers) {
    const guard = handler.indexOf("await requireAuthorityApi(request)");
    assert.ok(guard > -1, "handler is missing requireAuthorityApi");
    assert.ok(handler.indexOf("if (!auth.ok) return auth.response;") > guard);
    assert.ok(!handler.includes("allowCron"), "mode changes must not accept CRON_SECRET");
    const write = handler.indexOf("updateAutopilotMode");
    if (write > -1) assert.ok(write > guard, "the write happens before the auth guard");
  }
});

test("an unauthenticated caller cannot change the stored mode", () => {
  const auth = readFileSync("lib/authority/auth.ts", "utf8");
  // Every branch that fails to resolve an admin returns user: null, so
  // requireAuthorityApi answers 401/403 and the PATCH handler above returns
  // before updateAutopilotMode is ever reached. There is no anonymous fallback.
  assert.match(auth, /if \(!supabase\) return \{ user: null/);
  assert.match(auth, /if \(!user\?\.email\) return \{ user: null/);
  assert.match(auth, /if \(!isAdminRole\(role\)\) return \{ user: null/);
  assert.match(auth, /status: unauthenticated \? 401 : 403/);
  assert.match(auth, /AUTHENTICATION_REQUIRED/);
  assert.match(auth, /ADMIN_ROLE_REQUIRED/);
  // Role is read from the profiles table, never from client-writable metadata.
  assert.match(auth, /\.from\("profiles"\)/);
  assert.doesNotMatch(auth, /user_metadata\?\.role/);
});
