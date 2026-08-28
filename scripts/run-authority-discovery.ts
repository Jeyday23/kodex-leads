import { runOpportunityDiscovery } from "@/lib/authority/opportunities";

async function main() {
  const runType = process.env.AUTHORITY_RUN_TYPE ?? "daily-discovery";
  const result = await runOpportunityDiscovery({
    actor: "render-cron",
    runType,
    idempotencyKey: `${runType}-${new Date().toISOString().slice(0, 10)}`,
  });

  console.log(JSON.stringify({ service: "kodex-authority-discovery", ...result }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
