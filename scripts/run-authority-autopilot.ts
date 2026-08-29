import { getAutopilotStatus, runAutopilot } from "@/lib/authority/autonomous-ranking";

async function main() {
  const scheduledEnabled = process.env.AUTOPILOT_SCHEDULE_ENABLED === "true";
  const status = await getAutopilotStatus();

  if (!scheduledEnabled) {
    console.log(JSON.stringify({
      service: "kodex-authority-autopilot",
      status: "disabled",
      reason: "AUTOPILOT_SCHEDULE_ENABLED is not true",
      mode: status.mode,
    }));
    return;
  }

  if (!status.databaseConfigured) {
    console.log(JSON.stringify({
      service: "kodex-authority-autopilot",
      status: "disabled",
      reason: "Autonomy settings database is unavailable",
    }));
    return;
  }

  if (status.mode === "off") {
    console.log(JSON.stringify({
      service: "kodex-authority-autopilot",
      status: "off",
      reason: "Autopilot mode is off",
    }));
    return;
  }

  const result = await runAutopilot({ actor: "render-cron" });
  console.log(JSON.stringify({ service: "kodex-authority-autopilot", ...result }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
