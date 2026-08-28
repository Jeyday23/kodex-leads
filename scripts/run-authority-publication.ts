import { listContentAssets, publishContentAsset } from "@/lib/authority/autonomous-ranking";

async function main() {
  const assets = await listContentAssets(25);
  const results = [];
  for (const asset of assets.filter((item) => item.status === "approved")) {
    results.push(await publishContentAsset(asset.id, "render-publication-worker"));
  }
  console.log(JSON.stringify({ service: "kodex-authority-publication", attempted: results.length, results }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
