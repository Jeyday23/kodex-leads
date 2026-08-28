import { repairTechnicalSeo } from "@/lib/authority/autonomous-ranking";

async function main() {
  const result = await repairTechnicalSeo("render-technical-audit");
  console.log(JSON.stringify({ service: "kodex-authority-technical-audit", ...result }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
