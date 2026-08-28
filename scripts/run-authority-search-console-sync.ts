import { syncSearchConsole } from "@/lib/authority/autonomous-ranking";

async function main() {
  const result = await syncSearchConsole({ actor: "render-search-console-sync" });
  console.log(JSON.stringify({ service: "kodex-authority-search-console-sync", ...result }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
