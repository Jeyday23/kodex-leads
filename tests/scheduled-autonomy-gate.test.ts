import test from "node:test";
import assert from "node:assert/strict";
import { scheduledAutonomyEnabled, skipScheduledAutonomy } from "../scripts/scheduled-autonomy-gate";

test("scheduled autonomy is off unless explicitly set to true", () => {
  const previous = process.env.AUTOPILOT_SCHEDULE_ENABLED;
  try {
    delete process.env.AUTOPILOT_SCHEDULE_ENABLED;
    assert.equal(scheduledAutonomyEnabled(), false);

    process.env.AUTOPILOT_SCHEDULE_ENABLED = "false";
    assert.equal(scheduledAutonomyEnabled(), false);

    process.env.AUTOPILOT_SCHEDULE_ENABLED = "TRUE";
    assert.equal(scheduledAutonomyEnabled(), false);

    process.env.AUTOPILOT_SCHEDULE_ENABLED = "true";
    assert.equal(scheduledAutonomyEnabled(), true);
  } finally {
    if (previous === undefined) delete process.env.AUTOPILOT_SCHEDULE_ENABLED;
    else process.env.AUTOPILOT_SCHEDULE_ENABLED = previous;
  }
});

test("scheduled autonomy fails closed when the status lookup throws", async () => {
  const previous = process.env.AUTOPILOT_SCHEDULE_ENABLED;
  const previousLog = console.log;
  const logs: string[] = [];
  try {
    process.env.AUTOPILOT_SCHEDULE_ENABLED = "true";
    console.log = (...args: unknown[]) => logs.push(args.map(String).join(" "));

    const shouldSkip = await skipScheduledAutonomy("test-service", async () => {
      throw new Error("Supabase unavailable");
    });

    assert.equal(shouldSkip, true);
    assert.equal(logs.some((line) => line.includes("Autonomy status check failed")), true);
    assert.equal(logs.some((line) => line.includes("Supabase unavailable")), true);
  } finally {
    console.log = previousLog;
    if (previous === undefined) delete process.env.AUTOPILOT_SCHEDULE_ENABLED;
    else process.env.AUTOPILOT_SCHEDULE_ENABLED = previous;
  }
});
