import { runAuthorityMonitoringCycle } from "@/lib/authority/monitoring";

async function main() {
  const result = await runAuthorityMonitoringCycle({ promptLimit: 5 });
  console.log(JSON.stringify({
    service: "kodex-authority-monitoring-cron",
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
