import { listContentAssets, publishContentAsset } from "@/lib/authority/autonomous-ranking";
import { skipScheduledAutonomy } from "./scheduled-autonomy-gate";

async function main() {
  const service = "kodex-authority-publication";
  if (await skipScheduledAutonomy(service)) return;
  const assets = await listContentAssets(25);
  const results = [];
  for (const asset of assets.filter((item) => item.status === "approved")) {
    results.push(await publishContentAsset(asset.id, "render-publication-worker"));
  }
  console.log(JSON.stringify({ service, attempted: results.length, results }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
