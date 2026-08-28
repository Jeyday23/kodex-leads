import { getSeoSupabase } from "@/lib/seo/db";
import { skipScheduledAutonomy } from "./scheduled-autonomy-gate";

async function main() {
  const service = "kodex-authority-retry";
  if (skipScheduledAutonomy(service)) return;
  const supabase = getSeoSupabase();
  let marked = 0;

  if (supabase) {
    const { data } = await supabase
      .from("job_failures")
      .select("id,retry_count")
      .lt("retry_count", 3)
      .order("created_at", { ascending: true })
      .limit(25);

    for (const failure of data ?? []) {
      await supabase.from("job_failures").update({ retry_count: Number(failure.retry_count ?? 0) + 1 }).eq("id", failure.id);
      marked += 1;
    }
  }

  console.log(JSON.stringify({
    service,
    status: supabase ? "completed" : "database-unavailable",
    retried: marked,
  }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
