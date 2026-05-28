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
        <h1 className="text-2xl font-bold text-navy mb-1">Scrapers</h1>
        <p className="text-sm text-text-muted">
          Monitor and trigger scraper runs
        </p>
      </div>

      <ScraperActions />

      <div className="border border-border rounded-xl overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-bg-muted border-b border-border">
              <th className="text-left px-4 py-3 font-medium text-text-muted">
                Type
              </th>
              <th className="text-center px-4 py-3 font-medium text-text-muted">
                Status
              </th>
              <th className="text-right px-4 py-3 font-medium text-text-muted">
                Found
              </th>
              <th className="text-right px-4 py-3 font-medium text-text-muted">
                Qualified
              </th>
              <th className="text-left px-4 py-3 font-medium text-text-muted">
                Started
              </th>
              <th className="text-left px-4 py-3 font-medium text-text-muted">
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
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-navy capitalize">
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
                    <td className="px-4 py-3 text-right text-navy">
                      {r.leads_found}
                    </td>
                    <td className="px-4 py-3 text-right text-navy">
                      {r.leads_qualified}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {new Date(r.started_at).toLocaleString("de-DE")}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {duration !== null ? `${duration}s` : "—"}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-text-muted"
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
