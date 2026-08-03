import { listContentAssets, validateContentAsset } from "@/lib/authority/autonomous-ranking";

async function main() {
  const assets = await listContentAssets(25);
  const results = [];
  for (const asset of assets.filter((item) => ["drafting", "briefed", "validating"].includes(item.status))) {
    results.push(await validateContentAsset(asset.id, "render-quality-worker"));
  }
  console.log(JSON.stringify({ service: "kodex-authority-quality-gates", validated: results.length, results }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
