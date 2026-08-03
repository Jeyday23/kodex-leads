import { runAutopilot } from "@/lib/authority/autonomous-ranking";

async function main() {
  const result = await runAutopilot({ actor: "render-research-worker", modeOverride: "draft_only" });
  console.log(JSON.stringify({ service: "kodex-authority-research", ...result }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
