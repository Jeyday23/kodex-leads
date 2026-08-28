import { runAutopilot } from "@/lib/authority/autonomous-ranking";

async function main() {
  const result = await runAutopilot({ actor: "render-cron" });
  console.log(JSON.stringify({ service: "kodex-authority-autopilot", ...result }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
