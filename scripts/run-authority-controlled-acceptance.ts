import { controlledAcceptanceTest } from "@/lib/authority/autonomous-ranking";

async function main() {
  const result = await controlledAcceptanceTest("render-controlled-acceptance");
  console.log(JSON.stringify({ service: "kodex-authority-controlled-acceptance", ...result }, null, 2));

  if (!result.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
