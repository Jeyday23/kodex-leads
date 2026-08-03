import { runOpportunityDiscovery } from "@/lib/authority/opportunities";

const result = await runOpportunityDiscovery({
  actor: "render-worker",
  runType: "worker-discovery",
  idempotencyKey: `worker-discovery-${new Date().toISOString().slice(0, 13)}`,
});

console.log(JSON.stringify({ service: "kodex-authority-discovery-worker", ...result }));
