import { cn } from "@/lib/utils";

export function ScoreBadge({ score }: { score: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium",
        score >= 40 && "bg-emerald-100 text-emerald-700",
        score >= 20 && score < 40 && "bg-amber-100 text-amber-700",
        score < 20 && "bg-gray-100 text-gray-500"
      )}
    >
      {score}
    </span>
  );
}
