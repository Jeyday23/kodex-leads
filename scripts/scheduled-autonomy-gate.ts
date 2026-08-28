export function scheduledAutonomyEnabled(): boolean {
  return process.env.AUTOPILOT_SCHEDULE_ENABLED === "true";
}

export function skipScheduledAutonomy(service: string): boolean {
  if (scheduledAutonomyEnabled()) return false;
  console.log(JSON.stringify({ service, status: "skipped", reason: "AUTOPILOT_SCHEDULE_ENABLED is not true" }));
  return true;
}
