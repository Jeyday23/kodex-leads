import { syncSearchConsole } from "@/lib/authority/autonomous-ranking";
import { skipScheduledAutonomy } from "./scheduled-autonomy-gate";

async function main() {
  const service = "kodex-authority-search-console-sync";
  if (skipScheduledAutonomy(service)) return;
  const result = await syncSearchConsole({ actor: "render-search-console-sync" });
  console.log(JSON.stringify({ service, ...result }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
