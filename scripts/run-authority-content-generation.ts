import { runAutopilot } from "@/lib/authority/autonomous-ranking";

async function main() {
  const result = await runAutopilot({ actor: "render-content-worker", modeOverride: "draft_only" });
  console.log(JSON.stringify({ service: "kodex-authority-content-generation", ...result }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
