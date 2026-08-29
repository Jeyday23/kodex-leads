export function scheduledAutonomyEnabled(): boolean {
  return process.env.AUTOPILOT_SCHEDULE_ENABLED === "true";
}

type AutopilotStatus = {
  databaseConfigured: boolean;
  mode: string;
};

type AutopilotStatusLoader = () => Promise<AutopilotStatus>;

export async function skipScheduledAutonomy(
  service: string,
  loadStatus?: AutopilotStatusLoader,
): Promise<boolean> {
  if (!scheduledAutonomyEnabled()) {
    console.log(JSON.stringify({ service, status: "skipped", reason: "AUTOPILOT_SCHEDULE_ENABLED is not true" }));
    return true;
  }

  try {
    const statusLoader = loadStatus ?? (async () => {
      const { getAutopilotStatus } = await import("@/lib/authority/autonomous-ranking");
      return getAutopilotStatus();
    });
    const status = await statusLoader();
    if (!status.databaseConfigured) {
      console.log(JSON.stringify({ service, status: "skipped", reason: "Autonomy settings database is unavailable" }));
      return true;
    }
    if (status.mode === "off") {
      console.log(JSON.stringify({ service, status: "skipped", reason: "Autopilot mode is off" }));
      return true;
    }
    return false;
  } catch (error) {
    console.log(JSON.stringify({
      service,
      status: "skipped",
      reason: "Autonomy status check failed",
      error: error instanceof Error ? error.message : String(error),
    }));
    return true;
  }
}
