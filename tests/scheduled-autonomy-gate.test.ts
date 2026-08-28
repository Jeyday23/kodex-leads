import test from "node:test";
import assert from "node:assert/strict";
import { scheduledAutonomyEnabled } from "../scripts/scheduled-autonomy-gate";

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
