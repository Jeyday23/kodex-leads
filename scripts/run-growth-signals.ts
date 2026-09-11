import { getBrainContextBundle } from "@/lib/growth/context";
import { runSignals } from "@/lib/growth/signals/run-signals";

async function main() {
  if (process.env.LEAD_AUTOMATION_ENABLED === "false") {
    console.log(JSON.stringify({
      service: "kodex-growth-signals",
      status: "disabled",
      reason: "LEAD_AUTOMATION_ENABLED=false",
    }));
    return;
  }

  const bundle = await getBrainContextBundle();
  const result = await runSignals(bundle);

  const failed = result.outcomes.filter((outcome) => outcome.status === "failed");

  console.log(JSON.stringify({
    service: "kodex-growth-signals",
    status: failed.length > 0 ? "completed-with-errors" : "completed",
    outcomes: result.outcomes,
    storedCount: result.storedCount,
    duplicateCount: result.duplicateCount,
    storageNote: result.storageNote,
  }));

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
