import { createAdminClient } from "@/lib/supabase/server";
import { ScraperActions } from "./actions";

export default async function ScrapersPage() {
  const admin = createAdminClient();
  const { data: runs } = await admin
    .from("scrape_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F1F3D] mb-1">Scrapers</h1>
        <p className="text-sm text-[#7a8599]">
          Monitor and trigger scraper runs
        </p>
      </div>

      <ScraperActions />

      <div className="border border-[#dfe3ea] rounded-xl overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#f6f7f9] border-b border-[#dfe3ea]">
              <th className="text-left px-4 py-3 font-medium text-[#7a8599]">
                Type
              </th>
              <th className="text-center px-4 py-3 font-medium text-[#7a8599]">
                Status
              </th>
              <th className="text-right px-4 py-3 font-medium text-[#7a8599]">
                Found
              </th>
              <th className="text-right px-4 py-3 font-medium text-[#7a8599]">
                Qualified
              </th>
              <th className="text-left px-4 py-3 font-medium text-[#7a8599]">
                Started
              </th>
              <th className="text-left px-4 py-3 font-medium text-[#7a8599]">
                Duration
              </th>
            </tr>
          </thead>
          <tbody>
            {runs && runs.length > 0 ? (
              runs.map((r) => {
                const duration =
                  r.finished_at && r.started_at
                    ? Math.round(
                        (new Date(r.finished_at).getTime() -
                          new Date(r.started_at).getTime()) /
                          1000
                      )
                    : null;

                return (
                  <tr
                    key={r.id}
                    className="border-b border-[#dfe3ea] last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-[#0F1F3D] capitalize">
                      {r.scraper_type}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.status === "completed"
                            ? "bg-emerald-100 text-emerald-700"
                            : r.status === "running"
                              ? "bg-amber-100 text-amber-700 animate-pulse"
                              : "bg-red-100 text-red-600"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-[#3d4a5c]">
                      {r.leads_found}
                    </td>
                    <td className="px-4 py-3 text-right text-[#3d4a5c]">
                      {r.leads_qualified}
                    </td>
                    <td className="px-4 py-3 text-[#7a8599]">
                      {new Date(r.started_at).toLocaleString("de-DE")}
                    </td>
                    <td className="px-4 py-3 text-[#7a8599]">
                      {duration !== null ? `${duration}s` : "—"}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-[#7a8599]"
                >
                  No scraper runs yet. Click &quot;Run Now&quot; to start.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
