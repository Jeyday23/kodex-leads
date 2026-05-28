import { createAdminClient } from "@/lib/supabase/server";
import { Users, Target, TrendingUp, DollarSign, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function AdminOverview() {
  const admin = createAdminClient();

  const [
    { count: totalLeads },
    { count: qualifiedLeads },
    { count: partnerCount },
    { data: conversions },
    { data: recentEvents },
  ] = await Promise.all([
    admin.from("leads").select("*", { count: "exact", head: true }),
    admin
      .from("leads")
      .select("*", { count: "exact", head: true })
      .in("status", ["qualified", "claimed", "contacted", "demo_booked", "converted"]),
    admin
      .from("partners")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    admin.from("conversions").select("mrr, commission_amount"),
    admin
      .from("lead_events")
      .select("id, event_type, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const totalMrr =
    conversions?.reduce((s, c) => s + Number(c.mrr), 0) ?? 0;
  const conversionRate =
    totalLeads && totalLeads > 0
      ? ((conversions?.length ?? 0) / totalLeads * 100)
      : 0;

  const metrics = [
    { label: "Total Leads", value: totalLeads ?? 0, icon: Users, color: "text-purple bg-purple-50" },
    { label: "Qualified", value: qualifiedLeads ?? 0, icon: Target, color: "text-emerald-600 bg-emerald-50" },
    {
      label: "Conversion Rate",
      value: `${conversionRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: "text-teal bg-teal-50",
    },
    {
      label: "Total MRR",
      value: new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(totalMrr),
      icon: DollarSign,
      color: "text-emerald-600 bg-emerald-50",
    },
    { label: "Active Partners", value: partnerCount ?? 0, icon: UserCog, color: "text-blue-600 bg-blue-50" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy mb-1">
          Admin Overview
        </h1>
        <p className="text-sm text-text-muted">System-wide metrics and activity</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="border border-border rounded-xl p-4 bg-white"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={cn("p-1.5 rounded-lg", m.color)}>
                <m.icon className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs text-text-muted">{m.label}</span>
            </div>
            <p className="text-xl font-bold text-navy">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="border border-border rounded-xl bg-white">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-bold text-navy">Recent Activity</h2>
        </div>
        <div className="divide-y divide-border">
          {recentEvents && recentEvents.length > 0 ? (
            recentEvents.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between px-6 py-3"
              >
                <span className="text-sm text-navy capitalize">
                  {e.event_type.replace("_", " ")}
                </span>
                <span className="text-xs text-text-muted">
                  {new Date(e.created_at).toLocaleString("de-DE")}
                </span>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center text-sm text-text-muted">
              No activity yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
