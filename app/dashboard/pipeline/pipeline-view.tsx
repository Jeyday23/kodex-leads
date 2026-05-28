"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ScoreBadge } from "@/components/score-badge";

interface PipelineLead {
  id: string;
  company: string;
  score: number;
  outreach_status: string;
  primary_contact: { name: string; title: string } | null;
  days_in_stage: number;
}

const STAGES = [
  { key: "not_contacted", label: "Not Contacted", color: "border-gray-300" },
  { key: "emailed", label: "Emailed", color: "border-purple-400" },
  { key: "replied", label: "Replied", color: "border-blue-400" },
  { key: "meeting_booked", label: "Meeting Booked", color: "border-amber-400" },
  { key: "converted", label: "Converted", color: "border-emerald-400" },
] as const;

export function PipelineView({ leads }: { leads: PipelineLead[] }) {
  const router = useRouter();

  const grouped = new Map<string, PipelineLead[]>();
  for (const stage of STAGES) {
    grouped.set(stage.key, []);
  }
  for (const lead of leads) {
    const arr = grouped.get(lead.outreach_status);
    if (arr) arr.push(lead);
  }

  async function moveToStage(leadId: string, newStatus: string) {
    await fetch(`/api/leads/${leadId}/outreach`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outreach_status: newStatus }),
    });
    router.refresh();
  }

  return (
    <div className="grid grid-cols-5 gap-3 min-h-[60vh]">
      {STAGES.map((stage) => {
        const stageLeads = grouped.get(stage.key) ?? [];
        return (
          <div key={stage.key} className="flex flex-col">
            <div
              className={cn(
                "flex items-center justify-between px-3 py-2 rounded-t-xl border-t-4 bg-white",
                stage.color
              )}
            >
              <span className="text-xs font-bold text-[#0F1F3D] uppercase tracking-wider">
                {stage.label}
              </span>
              <span className="text-xs font-mono text-[#7a8599] bg-[#f6f7f9] px-2 py-0.5 rounded-full">
                {stageLeads.length}
              </span>
            </div>

            <div className="flex-1 bg-[#f6f7f9] rounded-b-xl p-2 space-y-2 overflow-y-auto">
              {stageLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="bg-white rounded-lg p-3 border border-[#dfe3ea] shadow-sm"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-medium text-[#0F1F3D] truncate">
                      {lead.company}
                    </p>
                    <ScoreBadge score={lead.score} />
                  </div>
                  {lead.primary_contact && (
                    <p className="text-xs text-[#7a8599] truncate mb-2">
                      {lead.primary_contact.name} · {lead.primary_contact.title}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#7a8599]">
                      {lead.days_in_stage}d
                    </span>
                    <div className="flex gap-1">
                      {STAGES.map(
                        (s) =>
                          s.key !== stage.key &&
                          s.key !== "not_contacted" && (
                            <button
                              key={s.key}
                              onClick={() => moveToStage(lead.id, s.key)}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-[#f6f7f9] text-[#7a8599] hover:bg-[#A855F7]/10 hover:text-[#A855F7] transition-colors"
                              title={`Move to ${s.label}`}
                            >
                              → {s.label.split(" ")[0]}
                            </button>
                          )
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {stageLeads.length === 0 && (
                <div className="text-center py-8 text-xs text-[#7a8599]">
                  Empty
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
