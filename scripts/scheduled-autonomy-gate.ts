import { getAutopilotStatus } from "@/lib/authority/autonomous-ranking";

export function scheduledAutonomyEnabled(): boolean {
  return process.env.AUTOPILOT_SCHEDULE_ENABLED === "true";
}

export async function skipScheduledAutonomy(service: string): Promise<boolean> {
  if (!scheduledAutonomyEnabled()) {
    console.log(JSON.stringify({ service, status: "skipped", reason: "AUTOPILOT_SCHEDULE_ENABLED is not true" }));
    return true;
  }

  const status = await getAutopilotStatus();
  if (!status.databaseConfigured) {
    console.log(JSON.stringify({ service, status: "skipped", reason: "Autonomy settings database is unavailable" }));
    return true;
  }
  if (status.mode === "off") {
    console.log(JSON.stringify({ service, status: "skipped", reason: "Autopilot mode is off" }));
    return true;
  }
  return false;
}
