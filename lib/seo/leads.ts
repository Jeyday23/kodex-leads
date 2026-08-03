import { getSeoSupabase } from "./db";
import { listLocalLeads, type StoredLead } from "./local-store";
import type { LeadScoreResult } from "./types";

export interface AdminLead {
  id: string;
  email: string;
  companyName: string;
  framework: string;
  landingPage: string;
  score: LeadScoreResult;
  storage: "supabase" | "local";
  createdAt: string;
  routingSummary: string;
}

export async function listAdminLeads(limit = 50): Promise<AdminLead[]> {
  const supabase = getSeoSupabase();
  if (!supabase) {
    const localLeads = await listLocalLeads(limit);
    return localLeads.map(mapLocalLead);
  }

  const { data, error } = await supabase
    .from("leads")
    .select("id,email,company_name,framework,landing_page,lead_score,lead_grade,recommended_action,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((lead) => ({
    id: String(lead.id),
    email: String(lead.email),
    companyName: String(lead.company_name ?? "Unknown company"),
    framework: String(lead.framework ?? "unknown"),
    landingPage: String(lead.landing_page ?? ""),
    score: {
      score: Number(lead.lead_score ?? 0),
      grade: String(lead.lead_grade ?? "low") as LeadScoreResult["grade"],
      recommendedAction: String(lead.recommended_action ?? "nurture") as LeadScoreResult["recommendedAction"],
      reasons: [],
    },
    storage: "supabase",
    createdAt: String(lead.created_at),
    routingSummary: "Stored in Supabase.",
  }));
}

function mapLocalLead(lead: StoredLead): AdminLead {
  return {
    id: lead.id,
    email: lead.input.email,
    companyName: lead.input.companyName,
    framework: lead.input.framework,
    landingPage: lead.input.landingPage,
    score: lead.score,
    storage: "local",
    createdAt: lead.createdAt,
    routingSummary: lead.routing.map((route) => `${route.channel}: ${route.status}`).join(", "),
  };
}
