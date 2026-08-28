import { planRevisionsFromMetrics } from "@/lib/authority/autonomous-ranking";
import { skipScheduledAutonomy } from "./scheduled-autonomy-gate";

async function main() {
  const service = "kodex-authority-revision-planner";
  if (skipScheduledAutonomy(service)) return;
  const result = await planRevisionsFromMetrics("render-revision-planner");
  console.log(JSON.stringify({ service, ...result }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
