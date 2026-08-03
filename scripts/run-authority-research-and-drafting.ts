import { runAutopilot } from "@/lib/authority/autonomous-ranking";

async function main() {
  const result = await runAutopilot({ actor: "render-research-and-drafting", modeOverride: "draft_only" });
  console.log(JSON.stringify({ service: "kodex-authority-research-and-drafting", ...result }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
