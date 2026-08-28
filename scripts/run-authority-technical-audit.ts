import { repairTechnicalSeo } from "@/lib/authority/autonomous-ranking";
import { skipScheduledAutonomy } from "./scheduled-autonomy-gate";

async function main() {
  const service = "kodex-authority-technical-audit";
  if (skipScheduledAutonomy(service)) return;
  const result = await repairTechnicalSeo("render-technical-audit");
  console.log(JSON.stringify({ service, ...result }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
