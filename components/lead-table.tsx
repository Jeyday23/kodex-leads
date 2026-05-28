"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ScoreBadge } from "./score-badge";
import { ArrowUpDown, Filter } from "lucide-react";

interface Lead {
  id: string;
  company: string;
  email: string;
  score: number;
  source: string;
  status: string;
  team_size: string;
  uses_ai: boolean;
  partner_id: string | null;
  created_at: string;
}

const SOURCE_LABELS: Record<string, string> = {
  organic: "Organic",
  checklist: "Checklist",
  scraper_jobs: "Job Board",
  scraper_startups: "Startup Finder",
  scraper_ai: "AI Registry",
  referral: "Referral",
};

const STATUS_STYLES: Record<string, string> = {
  new: "bg-gray-100 text-gray-600",
  qualified: "bg-emerald-100 text-emerald-700",
  claimed: "bg-blue-100 text-blue-700",
  contacted: "bg-purple-100 text-purple-700",
  demo_booked: "bg-amber-100 text-amber-700",
  converted: "bg-teal-100 text-teal-700",
  lost: "bg-red-100 text-red-600",
};

type SortKey = "score" | "created_at";

export function LeadTable({
  leads,
  onClaimLead,
  showClaim = true,
}: {
  leads: Lead[];
  onClaimLead?: (id: string) => void;
  showClaim?: boolean;
}) {
  const [sortBy, setSortBy] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filtered =
    filterStatus === "all"
      ? leads
      : leads.filter((l) => l.status === filterStatus);

  const sorted = [...filtered].sort((a, b) => {
    const mul = sortDir === "desc" ? -1 : 1;
    if (sortBy === "score") return (a.score - b.score) * mul;
    return (
      (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) *
      mul
    );
  });

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortDir("desc");
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Filter className="w-4 h-4 text-text-muted" />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-1.5 bg-white text-navy"
        >
          <option value="all">All statuses</option>
          <option value="new">New</option>
          <option value="qualified">Qualified</option>
          <option value="claimed">Claimed</option>
          <option value="contacted">Contacted</option>
          <option value="demo_booked">Demo Booked</option>
          <option value="converted">Converted</option>
          <option value="lost">Lost</option>
        </select>
        <span className="text-xs text-text-muted">
          {sorted.length} lead{sorted.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-bg-muted border-b border-border">
              <th className="text-left px-4 py-3 font-medium text-text-muted">
                Company
              </th>
              <th className="text-left px-4 py-3 font-medium text-text-muted hidden lg:table-cell">
                Email
              </th>
              <th className="px-4 py-3 font-medium text-text-muted">
                <button
                  className="inline-flex items-center gap-1"
                  onClick={() => toggleSort("score")}
                >
                  Score <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="text-left px-4 py-3 font-medium text-text-muted hidden md:table-cell">
                Source
              </th>
              <th className="text-left px-4 py-3 font-medium text-text-muted">
                Status
              </th>
              {showClaim && (
                <th className="px-4 py-3 font-medium text-text-muted">
                  Action
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.map((lead) => (
              <tr
                key={lead.id}
                className="border-b border-border last:border-0 hover:bg-bg-muted/50"
              >
                <td className="px-4 py-3 font-medium text-navy">
                  {lead.company}
                </td>
                <td className="px-4 py-3 text-text-muted hidden lg:table-cell">
                  {lead.email}
                </td>
                <td className="px-4 py-3 text-center">
                  <ScoreBadge score={lead.score} />
                </td>
                <td className="px-4 py-3 text-text-muted hidden md:table-cell">
                  {SOURCE_LABELS[lead.source] ?? lead.source}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                      STATUS_STYLES[lead.status] ?? "bg-gray-100 text-gray-600"
                    )}
                  >
                    {lead.status.replace("_", " ")}
                  </span>
                </td>
                {showClaim && (
                  <td className="px-4 py-3 text-center">
                    {lead.status === "qualified" && !lead.partner_id && (
                      <button
                        onClick={() => onClaimLead?.(lead.id)}
                        className="text-xs px-3 py-1 rounded-full bg-purple text-white hover:bg-purple transition-colors"
                      >
                        Claim
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={showClaim ? 6 : 5}
                  className="px-4 py-8 text-center text-text-muted"
                >
                  No leads found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
