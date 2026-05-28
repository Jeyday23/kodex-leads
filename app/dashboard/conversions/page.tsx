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
        <h1 className="text-2xl font-bold text-[#0F1F3D] mb-1">Conversions</h1>
        <p className="text-sm text-[#7a8599]">Track your deals and earnings</p>
      </div>

      <CommissionCard
        totalEarned={totalEarned}
        pendingPayout={pending}
        conversionCount={count}
        conversionRate={rate}
      />

      <div className="border border-[#dfe3ea] rounded-xl overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#f6f7f9] border-b border-[#dfe3ea]">
              <th className="text-left px-4 py-3 font-medium text-[#7a8599]">
                Company
              </th>
              <th className="text-left px-4 py-3 font-medium text-[#7a8599]">
                Plan
              </th>
              <th className="text-right px-4 py-3 font-medium text-[#7a8599]">
                MRR
              </th>
              <th className="text-right px-4 py-3 font-medium text-[#7a8599]">
                Commission
              </th>
              <th className="text-center px-4 py-3 font-medium text-[#7a8599]">
                Paid
              </th>
              <th className="text-left px-4 py-3 font-medium text-[#7a8599]">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {conversions && conversions.length > 0 ? (
              conversions.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-[#dfe3ea] last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-[#0F1F3D]">
                    {leadMap.get(c.lead_id) ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-[#3d4a5c] capitalize">
                    {c.plan}
                  </td>
                  <td className="px-4 py-3 text-right text-[#3d4a5c]">
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
                  <td className="px-4 py-3 text-[#7a8599]">
                    {new Date(c.created_at).toLocaleDateString("de-DE")}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-[#7a8599]"
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
