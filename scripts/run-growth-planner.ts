import { getBrainContextBundle } from "@/lib/growth/context";
import { runPlannerForToday } from "@/lib/growth/channels/planner";

async function main() {
  const service = "kodex-growth-planner";
  const bundle = await getBrainContextBundle();
  const summary = await runPlannerForToday(bundle);
  console.log(JSON.stringify({ service, ...summary }));
  if (summary.errors.length > 0) {
    throw new Error(`Planner run for ${summary.day} completed with ${summary.errors.length} error(s): ${summary.errors.join("; ")}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
