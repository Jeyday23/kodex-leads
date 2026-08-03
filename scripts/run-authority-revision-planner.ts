import { planRevisionsFromMetrics } from "@/lib/authority/autonomous-ranking";

async function main() {
  const result = await planRevisionsFromMetrics("render-revision-planner");
  console.log(JSON.stringify({ service: "kodex-authority-revision-planner", ...result }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
