import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CommissionCard } from "@/components/commission-card";

const fmt = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    n
  );

export default async function ConversionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: conversions } = await supabase
    .from("conversions")
    .select("*")
    .eq("partner_id", user.id)
    .order("created_at", { ascending: false });

  const { data: leads } = await supabase
    .from("leads")
    .select("id, company")
    .eq("partner_id", user.id);

  const leadMap = new Map(
    (leads ?? []).map((l) => [l.id, l.company])
  );

  const totalEarned =
    conversions?.reduce((s, c) => s + Number(c.commission_amount), 0) ?? 0;
  const pending =
    conversions
      ?.filter((c) => !c.paid_out)
      .reduce((s, c) => s + Number(c.commission_amount), 0) ?? 0;
  const count = conversions?.length ?? 0;
  const totalLeads = leads?.length ?? 0;
  const rate = totalLeads > 0 ? (count / totalLeads) * 100 : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy mb-1">Conversions</h1>
        <p className="text-sm text-text-muted">Track your deals and earnings</p>
      </div>

      <CommissionCard
        totalEarned={totalEarned}
        pendingPayout={pending}
        conversionCount={count}
        conversionRate={rate}
      />

      <div className="border border-border rounded-xl overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-bg-muted border-b border-border">
              <th className="text-left px-4 py-3 font-medium text-text-muted">
                Company
              </th>
              <th className="text-left px-4 py-3 font-medium text-text-muted">
                Plan
              </th>
              <th className="text-right px-4 py-3 font-medium text-text-muted">
                MRR
              </th>
              <th className="text-right px-4 py-3 font-medium text-text-muted">
                Commission
              </th>
              <th className="text-center px-4 py-3 font-medium text-text-muted">
                Paid
              </th>
              <th className="text-left px-4 py-3 font-medium text-text-muted">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {conversions && conversions.length > 0 ? (
              conversions.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-navy">
                    {leadMap.get(c.lead_id) ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-navy capitalize">
                    {c.plan}
                  </td>
                  <td className="px-4 py-3 text-right text-navy">
                    {fmt(Number(c.mrr))}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-emerald-600">
                    {fmt(Number(c.commission_amount))}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.paid_out
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {c.paid_out ? "Paid" : "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {new Date(c.created_at).toLocaleDateString("de-DE")}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-text-muted"
                >
                  No conversions yet. Close deals to see them here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
