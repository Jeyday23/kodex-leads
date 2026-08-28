import { listContentAssets, validateContentAsset } from "@/lib/authority/autonomous-ranking";
import { skipScheduledAutonomy } from "./scheduled-autonomy-gate";

async function main() {
  const service = "kodex-authority-quality-gates";
  if (await skipScheduledAutonomy(service)) return;
  const assets = await listContentAssets(25);
  const results = [];
  for (const asset of assets.filter((item) => ["drafting", "briefed", "validating"].includes(item.status))) {
    results.push(await validateContentAsset(asset.id, "render-quality-worker"));
  }
  console.log(JSON.stringify({ service, validated: results.length, results }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
