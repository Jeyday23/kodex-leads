import { runAutopilot } from "@/lib/authority/autonomous-ranking";
import { skipScheduledAutonomy } from "./scheduled-autonomy-gate";

async function main() {
  const service = "kodex-authority-research-and-drafting";
  if (await skipScheduledAutonomy(service)) return;
  const result = await runAutopilot({ actor: "render-research-and-drafting", modeOverride: "draft_only" });
  console.log(JSON.stringify({ service, ...result }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
