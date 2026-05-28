"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Bot, Loader2 } from "lucide-react";

const scraperTypes = [
  { key: "all", label: "Run All Scrapers", desc: "Jobs → Startups → AI → Enrich" },
];

export function ScraperActions() {
  const router = useRouter();
  const [running, setRunning] = useState(false);

  async function handleRun() {
    setRunning(true);
    try {
      await fetch("/api/cron", {
        headers: { Authorization: `Bearer ${getCronSecret()}` },
      });
      router.refresh();
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex gap-3">
      {scraperTypes.map((s) => (
        <button
          key={s.key}
          onClick={handleRun}
          disabled={running}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg",
            "border border-[#dfe3ea] text-sm bg-white",
            "hover:border-[#A855F7] hover:text-[#A855F7] transition-colors",
            "disabled:opacity-60 disabled:cursor-not-allowed"
          )}
        >
          {running ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Bot className="w-4 h-4" />
          )}
          {s.label}
        </button>
      ))}
    </div>
  );
}

function getCronSecret(): string {
  return process.env.NEXT_PUBLIC_CRON_SECRET ?? "";
}
