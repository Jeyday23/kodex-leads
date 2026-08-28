import { runOpportunityDiscovery } from "@/lib/authority/opportunities";
import { skipScheduledAutonomy } from "./scheduled-autonomy-gate";

async function main() {
  const service = "kodex-authority-discovery";
  if (skipScheduledAutonomy(service)) return;
  const runType = process.env.AUTHORITY_RUN_TYPE ?? "daily-discovery";
  const result = await runOpportunityDiscovery({
    actor: "render-cron",
    runType,
    idempotencyKey: `${runType}-${new Date().toISOString().slice(0, 10)}`,
  });

  console.log(JSON.stringify({ service, ...result }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
