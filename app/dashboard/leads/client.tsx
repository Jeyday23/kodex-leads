"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ScoreBadge } from "@/components/score-badge";
import { ArrowUpDown, Filter, Users, ExternalLink } from "lucide-react";

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
  outreach_status: string;
  contact_count: number;
  created_at: string;
}

const SOURCE_LABELS: Record<string, string> = {
  organic: "Organic",
  checklist: "Checklist",
  scraper_jobs: "Job Board",
  scraper_startups: "Startup Finder",
  scraper_ai: "AI Registry",
  referral: "Referral",
  assessment_eu_ai_act: "EU AI Act Assessment",
  assessment_gdpr: "GDPR Calculator",
  assessment_frameworks: "Stack Audit",
};

const OUTREACH_STYLES: Record<string, string> = {
  not_contacted: "bg-gray-100 text-gray-600",
  emailed: "bg-purple-100 text-purple-700",
  replied: "bg-blue-100 text-blue-700",
  meeting_booked: "bg-amber-100 text-amber-700",
  converted: "bg-emerald-100 text-emerald-700",
  not_interested: "bg-red-100 text-red-600",
};

type SortKey = "score" | "created_at" | "contact_count";

export function LeadsClient({ leads }: { leads: Lead[] }) {
  const router = useRouter();
  const [sortBy, setSortBy] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterOutreach, setFilterOutreach] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");

  const filtered = leads
    .filter(
      (l) => filterOutreach === "all" || l.outreach_status === filterOutreach
    )
    .filter((l) => filterSource === "all" || l.source === filterSource);

  const sorted = [...filtered].sort((a, b) => {
    const mul = sortDir === "desc" ? -1 : 1;
    if (sortBy === "score") return (a.score - b.score) * mul;
    if (sortBy === "contact_count")
      return (a.contact_count - b.contact_count) * mul;
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

  async function handleClaim(id: string) {
    const res = await fetch(`/api/leads/${id}/claim`, { method: "POST" });
    if (res.ok) router.refresh();
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Filter className="w-4 h-4 text-[#7a8599]" />
        <select
          value={filterOutreach}
          onChange={(e) => setFilterOutreach(e.target.value)}
          className="text-sm border border-[#dfe3ea] rounded-lg px-3 py-1.5 bg-white text-[#3d4a5c]"
        >
          <option value="all">All outreach</option>
          <option value="not_contacted">Not Contacted</option>
          <option value="emailed">Emailed</option>
          <option value="replied">Replied</option>
          <option value="meeting_booked">Meeting Booked</option>
          <option value="converted">Converted</option>
          <option value="not_interested">Not Interested</option>
        </select>
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className="text-sm border border-[#dfe3ea] rounded-lg px-3 py-1.5 bg-white text-[#3d4a5c]"
        >
          <option value="all">All sources</option>
          {Object.entries(SOURCE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <span className="text-xs text-[#7a8599]">
          {sorted.length} lead{sorted.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="border border-[#dfe3ea] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#f6f7f9] border-b border-[#dfe3ea]">
              <th className="text-left px-4 py-3 font-medium text-[#7a8599]">
                Company
              </th>
              <th className="px-4 py-3 font-medium text-[#7a8599]">
                <button
                  className="inline-flex items-center gap-1"
                  onClick={() => toggleSort("score")}
                >
                  Score <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-4 py-3 font-medium text-[#7a8599]">
                <button
                  className="inline-flex items-center gap-1"
                  onClick={() => toggleSort("contact_count")}
                >
                  <Users className="w-3 h-3" /> Contacts{" "}
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="text-left px-4 py-3 font-medium text-[#7a8599] hidden md:table-cell">
                Source
              </th>
              <th className="text-left px-4 py-3 font-medium text-[#7a8599]">
                Outreach
              </th>
              <th className="px-4 py-3 font-medium text-[#7a8599]">Action</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((lead) => (
              <tr
                key={lead.id}
                className="border-b border-[#dfe3ea] last:border-0 hover:bg-[#f6f7f9]/50"
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-[#0F1F3D]">{lead.company}</p>
                  <p className="text-xs text-[#7a8599]">{lead.email}</p>
                </td>
                <td className="px-4 py-3 text-center">
                  <ScoreBadge score={lead.score} />
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-xs font-medium",
                      lead.contact_count > 0
                        ? "text-[#0D9488]"
                        : "text-[#7a8599]"
                    )}
                  >
                    <Users className="w-3 h-3" />
                    {lead.contact_count}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#7a8599] hidden md:table-cell">
                  {SOURCE_LABELS[lead.source] ?? lead.source}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-block px-2 py-0.5 rounded-full text-xs font-medium",
                      OUTREACH_STYLES[lead.outreach_status] ??
                        "bg-gray-100 text-gray-600"
                    )}
                  >
                    {lead.outreach_status.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {lead.status === "qualified" && !lead.partner_id ? (
                    <button
                      onClick={() => handleClaim(lead.id)}
                      className="text-xs px-3 py-1 rounded-full bg-[#A855F7] text-white hover:bg-[#9333EA] transition-colors"
                    >
                      Claim
                    </button>
                  ) : lead.partner_id ? (
                    <a
                      href={`/dashboard`}
                      className="text-xs text-[#A855F7] hover:underline inline-flex items-center gap-1"
                    >
                      View <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : null}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-[#7a8599]"
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
