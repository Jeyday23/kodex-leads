"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const TARGET = new Date("2026-08-02T00:00:00Z").getTime();

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calcTimeLeft(): TimeLeft {
  const diff = Math.max(0, TARGET - Date.now());
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export function Countdown({ compact = false }: { compact?: boolean }) {
  const [time, setTime] = useState<TimeLeft>(calcTimeLeft);

  useEffect(() => {
    const id = setInterval(() => setTime(calcTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  const units: (keyof TimeLeft)[] = ["days", "hours", "minutes", "seconds"];

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-teal font-bold">
        {time.days}d {time.hours}h {time.minutes}m
      </span>
    );
  }

  return (
    <div className="inline-flex gap-3">
      {units.map((unit) => (
        <div
          key={unit}
          className={cn(
            "flex flex-col items-center justify-center",
            "bg-navy rounded-lg px-4 py-3 min-w-[72px]"
          )}
        >
          <span className="text-2xl lg:text-3xl font-mono font-bold text-teal">
            {String(time[unit]).padStart(2, "0")}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-white/60 mt-1">
            {unit}
          </span>
        </div>
      ))}
    </div>
  );
}
