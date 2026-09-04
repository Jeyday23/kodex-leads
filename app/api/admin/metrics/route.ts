import { NextResponse } from "next/server";
import { requireAuthorityApi } from "@/lib/authority/auth";
import { getSeoSupabase } from "@/lib/seo/db";

export async function GET(request: Request) {
  // Lead data is not public. Signed-in administrators only; this route is not
  // part of any cron path, so CRON_SECRET is deliberately not accepted here.
  const auth = await requireAuthorityApi(request);
  if (!auth.ok) return auth.response;

  try {
    // Server-side service-role client. The anon key is published to the
    // browser by Next.js, so it must never be the credential used to read
    // lead records.
    const supabase = getSeoSupabase();

    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase environment is not configured" },
        { status: 503 }
      );
    }

    // Get total leads count
    const { count: totalLeads } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true });

    // Get high-quality leads (score >= 70)
    const { count: qualityLeads } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .gte("lead_score", 70);

    // Get leads by grade distribution
    const { data: gradeDistribution } = await supabase
      .from("leads")
      .select("lead_grade, count:id");

    // Get leads by framework
    const { data: byFramework } = await supabase
      .from("leads")
      .select("framework")
      .neq("framework", null);

    // Get monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: monthlyData } = await supabase
      .from("leads")
      .select("created_at")
      .gte("created_at", sixMonthsAgo.toISOString())
      .order("created_at", { ascending: true });

    // Calculate conversion rate (leads with recommended_action)
    const { count: converted } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .neq("recommended_action", null);

    const conversionRate = totalLeads
      ? Math.round((converted! / totalLeads) * 100)
      : 0;

    // Group monthly data
    const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      const monthName = date.toLocaleString("default", { month: "short" });
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const count = monthlyData?.filter((item) => {
        const created = new Date(item.created_at);
        return created >= monthStart && created <= monthEnd;
      }).length || 0;

      return {
        name: monthName,
        leads: count,
        completed: Math.floor(count * (conversionRate / 100)),
      };
    });

    return NextResponse.json({
      metrics: {
        totalLeads: totalLeads || 0,
        completed: qualityLeads || 0,
        conversion: conversionRate,
        pending: (totalLeads || 0) - (qualityLeads || 0),
      },
      monthlyTrend,
      gradeDistribution: gradeDistribution || [],
      frameworks: Array.from(
        new Set(byFramework?.map((d) => d.framework).filter(Boolean))
      ),
    });
  } catch (error) {
    console.error("Metrics API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}
