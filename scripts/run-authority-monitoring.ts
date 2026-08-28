import { runAuthorityMonitoringCycle } from "@/lib/authority/monitoring";
import { skipScheduledAutonomy } from "./scheduled-autonomy-gate";

async function main() {
  const service = "kodex-authority-monitoring-cron";
  if (skipScheduledAutonomy(service)) return;
  const result = await runAuthorityMonitoringCycle({ promptLimit: 5 });
  console.log(JSON.stringify({
    service,
    status: result.status,
    checkedAt: result.checkedAt,
    runs: result.runs.length,
    failures: result.failures.length,
  }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
