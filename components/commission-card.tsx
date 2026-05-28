import { cn } from "@/lib/utils";
import { DollarSign, TrendingUp, Users, Clock } from "lucide-react";

interface CommissionCardProps {
  totalEarned: number;
  pendingPayout: number;
  conversionCount: number;
  conversionRate: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(n);

export function CommissionCard({
  totalEarned,
  pendingPayout,
  conversionCount,
  conversionRate,
}: CommissionCardProps) {
  const stats = [
    {
      label: "Total Earned",
      value: fmt(totalEarned),
      icon: DollarSign,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Pending Payout",
      value: fmt(pendingPayout),
      icon: Clock,
      color: "text-amber-600 bg-amber-50",
    },
    {
      label: "Conversions",
      value: String(conversionCount),
      icon: Users,
      color: "text-[#A855F7] bg-purple-50",
    },
    {
      label: "Close Rate",
      value: `${conversionRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: "text-[#0D9488] bg-teal-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="border border-[#dfe3ea] rounded-xl p-4 bg-white"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={cn("p-2 rounded-lg", s.color)}>
              <s.icon className="w-4 h-4" />
            </div>
            <span className="text-xs text-[#7a8599] uppercase tracking-wide">
              {s.label}
            </span>
          </div>
          <p className="text-xl font-bold text-[#0F1F3D]">{s.value}</p>
        </div>
      ))}
    </div>
  );
}
